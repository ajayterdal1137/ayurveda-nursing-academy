from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timedelta, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'ayurveda-academy-secret-2026')
JWT_ALGO = 'HS256'
JWT_EXP_DAYS = 30

app = FastAPI(title="Ayurveda Nursing Academy API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ Models ============
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal['student', 'teacher', 'admin'] = 'student'
    referral_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str] = None
    created_at: str


class Lesson(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    type: Literal['pdf', 'word', 'video']
    url: str
    duration: Optional[str] = None
    order: int = 0
    preview: bool = False


class Course(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: str
    description: str
    category: str
    instructor: str
    thumbnail: str
    price_inr: int
    price_usd: int
    rating: float = 4.7
    students_count: int = 0
    duration: str
    access_period_days: int = 365
    lessons: List[Lesson] = []
    tags: List[str] = []
    featured: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CourseCreate(BaseModel):
    title: str
    subtitle: str
    description: str
    category: str
    instructor: str
    thumbnail: str
    price_inr: int
    price_usd: int
    duration: str
    access_period_days: int = 365
    lessons: List[Lesson] = []
    tags: List[str] = []
    featured: bool = False


class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: List[str]
    correct_index: int
    explanation: Optional[str] = None
    image: Optional[str] = None


class Quiz(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: str
    category: str
    thumbnail: str
    questions: List[Question]


class QuizSubmission(BaseModel):
    quiz_id: str
    answers: List[int]


class Note(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    body: str
    color: str = "#2B3B31"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class NoteCreate(BaseModel):
    title: str
    body: str
    color: Optional[str] = "#2B3B31"


class LiveClass(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    instructor: str
    starts_at: str
    duration_min: int
    thumbnail: str
    description: str
    join_url: str


class Enrollment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    course_id: str
    progress: float = 0.0
    completed_lessons: List[str] = []
    enrolled_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None
    certificate_issued: bool = False


class OrderRequest(BaseModel):
    course_id: str
    gateway: Literal['razorpay', 'stripe']
    currency: Literal['INR', 'USD']
    apply_wallet: bool = False


class VerifyPayment(BaseModel):
    order_id: str
    course_id: str


class ProgressUpdate(BaseModel):
    course_id: str
    lesson_id: str


# ============ Helpers ============
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Missing auth token')
    token = authorization.split(' ', 1)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        raise HTTPException(401, 'Invalid token')
    user = await db.users.find_one({'id': data['sub']}, {'_id': 0, 'password': 0})
    if not user:
        raise HTTPException(401, 'User not found')
    return user


def _enrollment_status(enrollment: Optional[dict]) -> dict:
    """Returns {enrolled, expired, expires_at, days_remaining} for an enrollment doc (or None)."""
    if not enrollment:
        return {'enrolled': False, 'expired': False, 'expires_at': None, 'days_remaining': None}
    exp = enrollment.get('expires_at')
    if not exp:
        return {'enrolled': True, 'expired': False, 'expires_at': None, 'days_remaining': None}
    try:
        dt = datetime.fromisoformat(exp.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        expired = dt < now
        days = max(0, (dt - now).days)
        return {'enrolled': True, 'expired': expired, 'expires_at': exp, 'days_remaining': days}
    except Exception:
        return {'enrolled': True, 'expired': False, 'expires_at': exp, 'days_remaining': None}


REFERRAL_BONUS_INR = 100


def gen_referral_code(name: str) -> str:
    return (name[:3].upper() if name else "AYR") + uuid.uuid4().hex[:5].upper()


# ============ Auth ============
@api_router.post('/auth/register')
async def register(payload: UserRegister):
    existing = await db.users.find_one({'email': payload.email.lower()})
    if existing:
        raise HTTPException(400, 'Email already registered')
    user_id = str(uuid.uuid4())
    referrer_id = None
    wallet = 0
    if payload.referral_code:
        ref = await db.users.find_one({'referral_code': payload.referral_code.strip().upper()})
        if ref:
            referrer_id = ref['id']
            wallet = REFERRAL_BONUS_INR
            # Credit referrer
            await db.users.update_one({'id': referrer_id}, {'$inc': {'wallet_balance': REFERRAL_BONUS_INR}})
            await db.wallet_txns.insert_one({
                'id': str(uuid.uuid4()), 'user_id': referrer_id,
                'amount': REFERRAL_BONUS_INR, 'kind': 'referral_credit',
                'note': f"Friend {payload.name} signed up using your code",
                'created_at': datetime.now(timezone.utc).isoformat(),
            })
    user_doc = {
        'id': user_id,
        'name': payload.name,
        'email': payload.email.lower(),
        'role': payload.role,
        'password': hash_pw(payload.password),
        'avatar': None,
        'wallet_balance': wallet,
        'referral_code': gen_referral_code(payload.name),
        'referred_by': referrer_id,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    if wallet:
        await db.wallet_txns.insert_one({
            'id': str(uuid.uuid4()), 'user_id': user_id,
            'amount': wallet, 'kind': 'referral_signup_bonus',
            'note': 'Welcome bonus for using a referral code',
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
    token = make_token(user_id, payload.role)
    user_doc.pop('password', None)
    user_doc.pop('_id', None)
    return {'token': token, 'user': user_doc}


@api_router.post('/auth/login')
async def login(payload: UserLogin):
    user = await db.users.find_one({'email': payload.email.lower()})
    if not user or not verify_pw(payload.password, user['password']):
        raise HTTPException(401, 'Invalid email or password')
    token = make_token(user['id'], user['role'])
    user.pop('password', None)
    user.pop('_id', None)
    return {'token': token, 'user': user}


@api_router.get('/auth/me')
async def me(user=Depends(current_user)):
    return user


# ============ Courses ============
@api_router.get('/courses')
async def list_courses(category: Optional[str] = None, featured: Optional[bool] = None, q: Optional[str] = None):
    query: dict = {}
    if category and category != 'All':
        query['category'] = category
    if featured is not None:
        query['featured'] = featured
    if q:
        query['$or'] = [
            {'title': {'$regex': q, '$options': 'i'}},
            {'subtitle': {'$regex': q, '$options': 'i'}},
            {'description': {'$regex': q, '$options': 'i'}},
            {'instructor': {'$regex': q, '$options': 'i'}},
            {'category': {'$regex': q, '$options': 'i'}},
            {'tags': {'$regex': q, '$options': 'i'}},
        ]
    courses = await db.courses.find(query, {'_id': 0}).to_list(200)
    return courses


@api_router.get('/courses/{course_id}')
async def get_course(course_id: str):
    course = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not course:
        raise HTTPException(404, 'Course not found')
    return course


@api_router.post('/courses')
async def create_course(payload: CourseCreate, user=Depends(current_user)):
    if user['role'] not in ('teacher', 'admin'):
        raise HTTPException(403, 'Only teachers/admin can create courses')
    course = Course(**payload.dict())
    await db.courses.insert_one(course.dict())
    return course.dict()


@api_router.get('/categories')
async def list_categories():
    cats = await db.courses.distinct('category')
    return ['All'] + sorted(cats)


# ============ Quizzes ============
@api_router.get('/quizzes')
async def list_quizzes():
    quizzes = await db.quizzes.find({}, {'_id': 0}).to_list(100)
    # Return summary (no answers leaked in list)
    return [{'id': q['id'], 'title': q['title'], 'subtitle': q['subtitle'],
             'category': q['category'], 'thumbnail': q['thumbnail'],
             'question_count': len(q.get('questions', []))} for q in quizzes]


@api_router.get('/quizzes/{quiz_id}')
async def get_quiz(quiz_id: str):
    quiz = await db.quizzes.find_one({'id': quiz_id}, {'_id': 0})
    if not quiz:
        raise HTTPException(404, 'Quiz not found')
    return quiz


@api_router.post('/quizzes/submit')
async def submit_quiz(payload: QuizSubmission, user=Depends(current_user)):
    quiz = await db.quizzes.find_one({'id': payload.quiz_id}, {'_id': 0})
    if not quiz:
        raise HTTPException(404, 'Quiz not found')
    questions = quiz.get('questions', [])
    if len(payload.answers) != len(questions):
        raise HTTPException(400, 'Answer count mismatch')
    score = sum(1 for i, q in enumerate(questions) if payload.answers[i] == q['correct_index'])
    result = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'quiz_id': payload.quiz_id,
        'score': score,
        'total': len(questions),
        'percentage': round((score / len(questions)) * 100, 1) if questions else 0,
        'submitted_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.quiz_results.insert_one(result.copy())
    result.pop('_id', None)
    return result


# ============ Notes ============
@api_router.get('/notes')
async def list_notes(user=Depends(current_user)):
    notes = await db.notes.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return notes


@api_router.post('/notes')
async def create_note(payload: NoteCreate, user=Depends(current_user)):
    note = Note(user_id=user['id'], title=payload.title, body=payload.body, color=payload.color or '#2B3B31')
    await db.notes.insert_one(note.dict())
    return note.dict()


@api_router.delete('/notes/{note_id}')
async def delete_note(note_id: str, user=Depends(current_user)):
    await db.notes.delete_one({'id': note_id, 'user_id': user['id']})
    return {'ok': True}


# ============ Live Classes ============
@api_router.get('/live-classes')
async def list_live():
    classes = await db.live_classes.find({}, {'_id': 0}).sort('starts_at', 1).to_list(50)
    return classes


# ============ Enrollments / Progress ============
@api_router.get('/my/learning')
async def my_learning(user=Depends(current_user)):
    enrolls = await db.enrollments.find({'user_id': user['id']}, {'_id': 0}).to_list(200)
    result = []
    for e in enrolls:
        course = await db.courses.find_one({'id': e['course_id']}, {'_id': 0})
        if course:
            status = _enrollment_status(e)
            result.append({**e, 'course': course, 'expired': status['expired'], 'days_remaining': status['days_remaining']})
    return result


@api_router.post('/progress/mark-complete')
async def mark_complete(payload: ProgressUpdate, user=Depends(current_user)):
    enrollment = await db.enrollments.find_one({'user_id': user['id'], 'course_id': payload.course_id})
    if not enrollment:
        raise HTTPException(404, 'Not enrolled')
    completed = enrollment.get('completed_lessons', [])
    if payload.lesson_id not in completed:
        completed.append(payload.lesson_id)
    course = await db.courses.find_one({'id': payload.course_id}, {'_id': 0})
    total = len(course.get('lessons', [])) if course else 0
    progress = (len(completed) / total) * 100 if total else 0
    cert = progress >= 100
    await db.enrollments.update_one(
        {'id': enrollment['id']},
        {'$set': {'completed_lessons': completed, 'progress': progress, 'certificate_issued': cert}}
    )
    return {'progress': progress, 'completed_lessons': completed, 'certificate_issued': cert}


# ============ Payments (mocked verification for MVP) ============
@api_router.post('/payments/create-order')
async def create_order(payload: OrderRequest, user=Depends(current_user)):
    course = await db.courses.find_one({'id': payload.course_id}, {'_id': 0})
    if not course:
        raise HTTPException(404, 'Course not found')
    amount = course['price_inr'] if payload.currency == 'INR' else course['price_usd']
    wallet_applied = 0
    if payload.apply_wallet and payload.currency == 'INR':
        balance = (await db.users.find_one({'id': user['id']}, {'_id': 0})).get('wallet_balance', 0)
        wallet_applied = min(balance, amount)
        amount -= wallet_applied
    order = {
        'id': f"ord_{uuid.uuid4().hex[:16]}",
        'user_id': user['id'],
        'course_id': payload.course_id,
        'gateway': payload.gateway,
        'currency': payload.currency,
        'amount': amount,
        'wallet_applied': wallet_applied,
        'status': 'created',
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order.copy())
    order.pop('_id', None)
    return order


@api_router.post('/payments/verify')
async def verify_payment(payload: VerifyPayment, user=Depends(current_user)):
    order = await db.orders.find_one({'id': payload.order_id, 'user_id': user['id']}, {'_id': 0})
    if not order:
        raise HTTPException(404, 'Order not found')
    if order.get('wallet_applied', 0) > 0:
        await db.users.update_one({'id': user['id']}, {'$inc': {'wallet_balance': -order['wallet_applied']}})
        await db.wallet_txns.insert_one({
            'id': str(uuid.uuid4()), 'user_id': user['id'],
            'amount': -order['wallet_applied'], 'kind': 'course_purchase',
            'note': f"Used for order {payload.order_id}",
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
    await db.orders.update_one({'id': payload.order_id}, {'$set': {'status': 'paid'}})
    existing = await db.enrollments.find_one({'user_id': user['id'], 'course_id': payload.course_id})
    if not existing:
        enr = Enrollment(user_id=user['id'], course_id=payload.course_id)
        await db.enrollments.insert_one(enr.dict())
    return {'ok': True, 'status': 'paid'}


# ============ Wallet & Referrals ============
@api_router.get('/wallet')
async def get_wallet(user=Depends(current_user)):
    u = await db.users.find_one({'id': user['id']}, {'_id': 0, 'password': 0})
    txns = await db.wallet_txns.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(50)
    invited_count = await db.users.count_documents({'referred_by': user['id']})
    if not u.get('referral_code'):
        code = gen_referral_code(u.get('name', 'AYR'))
        await db.users.update_one({'id': user['id']}, {'$set': {'referral_code': code, 'wallet_balance': u.get('wallet_balance', 0)}})
        u['referral_code'] = code
    return {
        'balance': u.get('wallet_balance', 0),
        'referral_code': u['referral_code'],
        'referral_bonus': REFERRAL_BONUS_INR,
        'invited_count': invited_count,
        'transactions': txns,
    }


def _enrollment_status_local(enrollment: Optional[dict]) -> dict:
    return _enrollment_status(enrollment)


@api_router.get('/enrollments/check/{course_id}')
async def check_enrollment(course_id: str, user=Depends(current_user)):
    e = await db.enrollments.find_one({'user_id': user['id'], 'course_id': course_id}, {'_id': 0})
    return {**_enrollment_status(e), 'enrollment': e}


@api_router.get('/lessons/{lesson_id}/access')
async def lesson_access(lesson_id: str, course_id: str, user=Depends(current_user)):
    course = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not course:
        raise HTTPException(404, 'Course not found')
    lesson = next((ln for ln in course.get('lessons', []) if ln['id'] == lesson_id), None)
    if not lesson:
        raise HTTPException(404, 'Lesson not found')
    enrolled = await db.enrollments.find_one({'user_id': user['id'], 'course_id': course_id})
    status = _enrollment_status(enrolled)
    is_preview = lesson.get('preview', False)
    allowed = is_preview or (status['enrolled'] and not status['expired'])
    return {'allowed': allowed, 'lesson': lesson, 'is_preview': is_preview, **status}


@api_router.get('/certificates/{enrollment_id}')
async def get_certificate(enrollment_id: str, user=Depends(current_user)):
    enr = await db.enrollments.find_one({'id': enrollment_id, 'user_id': user['id']}, {'_id': 0})
    if not enr:
        raise HTTPException(404, 'Enrollment not found')
    if not enr.get('certificate_issued'):
        raise HTTPException(400, 'Certificate not yet earned')
    course = await db.courses.find_one({'id': enr['course_id']}, {'_id': 0})
    return {
        'enrollment_id': enrollment_id,
        'student_name': user['name'],
        'course_title': course['title'] if course else 'Unknown course',
        'instructor': course['instructor'] if course else '',
        'issued_at': enr.get('enrolled_at'),
        'certificate_id': f"AYR-{enrollment_id[:8].upper()}",
    }


# ============ Admin: content management ============
class AdminQuizCreate(BaseModel):
    title: str
    subtitle: str
    category: str
    thumbnail: str
    questions: List[Question]


@api_router.post('/admin/quizzes')
async def admin_create_quiz(payload: AdminQuizCreate, user=Depends(current_user)):
    if user['role'] not in ('teacher', 'admin'):
        raise HTTPException(403, 'Only teachers/admin can create quizzes')
    quiz = Quiz(**payload.dict())
    await db.quizzes.insert_one(quiz.dict())
    return quiz.dict()


@api_router.delete('/admin/courses/{course_id}')
async def admin_delete_course(course_id: str, user=Depends(current_user)):
    if user['role'] != 'admin':
        raise HTTPException(403, 'Only admin can delete courses')
    await db.courses.delete_one({'id': course_id})
    return {'ok': True}


@api_router.get('/admin/stats')
async def admin_stats(user=Depends(current_user)):
    if user['role'] not in ('teacher', 'admin'):
        raise HTTPException(403, 'Forbidden')
    counts = {
        'courses': await db.courses.count_documents({}),
        'quizzes': await db.quizzes.count_documents({}),
        'students': await db.users.count_documents({'role': 'student'}),
        'enrollments': await db.enrollments.count_documents({}),
        'orders_paid': await db.orders.count_documents({'status': 'paid'}),
        'tickets_open': await db.tickets.count_documents({'status': 'open'}),
    }
    return counts


# ============ Support Tickets & Help ============
class TicketCreate(BaseModel):
    subject: str
    category: str
    description: str


@api_router.get('/support/info')
async def support_info():
    return {
        'phone': '+91 98765 43210',
        'whatsapp': '+91 98765 43210',
        'email': 'support@ayurveda.academy',
        'address': 'Ayurveda Nursing Academy, Kerala, India',
        'website': 'https://ayurveda.academy',
        'instagram': 'https://instagram.com/ayurveda.academy',
        'facebook': 'https://facebook.com/ayurveda.academy',
        'youtube': 'https://youtube.com/@ayurveda.academy',
        'hours': 'Mon - Sat · 9:00 AM to 7:00 PM IST',
    }


@api_router.post('/support/tickets')
async def create_ticket(payload: TicketCreate, user=Depends(current_user)):
    ticket = {
        'id': f"TKT-{uuid.uuid4().hex[:8].upper()}",
        'user_id': user['id'],
        'user_name': user['name'],
        'user_email': user['email'],
        'subject': payload.subject,
        'category': payload.category,
        'description': payload.description,
        'status': 'open',
        'replies': [],
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.tickets.insert_one(ticket.copy())
    ticket.pop('_id', None)
    return ticket


@api_router.get('/support/tickets')
async def list_tickets(user=Depends(current_user)):
    tickets = await db.tickets.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return tickets


@api_router.get('/admin/tickets')
async def admin_list_tickets(user=Depends(current_user)):
    if user['role'] not in ('teacher', 'admin'):
        raise HTTPException(403, 'Forbidden')
    return await db.tickets.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)


class TicketReply(BaseModel):
    message: str
    close: bool = False


@api_router.post('/admin/tickets/{ticket_id}/reply')
async def admin_reply_ticket(ticket_id: str, payload: TicketReply, user=Depends(current_user)):
    if user['role'] not in ('teacher', 'admin'):
        raise HTTPException(403, 'Forbidden')
    reply = {
        'by': user['name'],
        'role': user['role'],
        'message': payload.message,
        'at': datetime.now(timezone.utc).isoformat(),
    }
    update = {'$push': {'replies': reply}}
    if payload.close:
        update['$set'] = {'status': 'resolved'}
    else:
        update['$set'] = {'status': 'in_progress'}
    await db.tickets.update_one({'id': ticket_id}, update)
    return {'ok': True}


# ============ Seed Data ============
async def seed_data():
    if await db.courses.count_documents({}) > 0:
        return
    sample_courses = [
        {
            "id": str(uuid.uuid4()),
            "title": "Foundations of Ayurveda",
            "subtitle": "Ancient wisdom for modern healing",
            "description": "Discover the core principles of Ayurveda — the three doshas (Vata, Pitta, Kapha), the five elements, and the philosophy of balance that has guided wellness for over 5,000 years.",
            "category": "Fundamentals",
            "instructor": "Dr. Anjali Sharma",
            "thumbnail": "https://images.pexels.com/photos/36863397/pexels-photo-36863397.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "price_inr": 1499,
            "price_usd": 29,
            "rating": 4.9,
            "students_count": 1284,
            "duration": "6h 20m",
            "featured": True,
            "tags": ["Beginner", "Theory", "Doshas"],
            "lessons": [
                {"id": str(uuid.uuid4()), "title": "Introduction to Ayurveda", "type": "video", "url": "https://www.youtube.com/embed/3QPGoIRyzpQ", "duration": "12:30", "order": 1},
                {"id": str(uuid.uuid4()), "title": "Ayurveda Basics — PDF Guide", "type": "pdf", "url": "https://www.africau.edu/images/default/sample.pdf", "duration": "15 min read", "order": 2},
                {"id": str(uuid.uuid4()), "title": "The Five Elements Explained", "type": "video", "url": "https://www.youtube.com/embed/oR_8DhSnUgY", "duration": "18:45", "order": 3},
                {"id": str(uuid.uuid4()), "title": "Doshas Study Notes (Word)", "type": "word", "url": "https://file-examples.com/storage/fe52cb0c4862dc676a1b341/2017/02/file-sample_100kB.doc", "duration": "10 min read", "order": 4},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Panchakarma Therapy Mastery",
            "subtitle": "Cleansing & rejuvenation protocols",
            "description": "Master the five purification therapies (Vamana, Virechana, Basti, Nasya, Raktamokshana) used to detoxify and restore balance to the body.",
            "category": "Panchakarma",
            "instructor": "Dr. Vikram Iyer",
            "thumbnail": "https://images.pexels.com/photos/6187847/pexels-photo-6187847.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "price_inr": 2499,
            "price_usd": 49,
            "rating": 4.8,
            "students_count": 842,
            "duration": "9h 50m",
            "featured": True,
            "tags": ["Advanced", "Therapy", "Detox"],
            "lessons": [
                {"id": str(uuid.uuid4()), "title": "Overview of Panchakarma", "type": "video", "url": "https://www.youtube.com/embed/F9Qnt6e0KYo", "duration": "20:15", "order": 1},
                {"id": str(uuid.uuid4()), "title": "Protocols Reference (PDF)", "type": "pdf", "url": "https://www.africau.edu/images/default/sample.pdf", "duration": "20 min read", "order": 2},
                {"id": str(uuid.uuid4()), "title": "Abhyanga Massage Technique", "type": "video", "url": "https://www.youtube.com/embed/L-S2Vp3FaWM", "duration": "25:00", "order": 3},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Herbal Medicine & Dravyaguna",
            "subtitle": "Healing herbs and formulations",
            "description": "An in-depth look at Ayurvedic herbs — their properties, doses, indications, and classical formulations used in nursing practice.",
            "category": "Herbal Medicine",
            "instructor": "Dr. Meera Krishnan",
            "thumbnail": "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=compress&cs=tinysrgb&w=940",
            "price_inr": 1999,
            "price_usd": 39,
            "rating": 4.7,
            "students_count": 612,
            "duration": "7h 10m",
            "featured": False,
            "tags": ["Intermediate", "Herbs"],
            "lessons": [
                {"id": str(uuid.uuid4()), "title": "Top 20 Ayurvedic Herbs", "type": "video", "url": "https://www.youtube.com/embed/Q2KdR2xrUQI", "duration": "22:00", "order": 1},
                {"id": str(uuid.uuid4()), "title": "Herbal Reference Manual", "type": "pdf", "url": "https://www.africau.edu/images/default/sample.pdf", "duration": "30 min read", "order": 2},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Clinical Ayurvedic Nursing",
            "subtitle": "Bedside practice & patient care",
            "description": "Hands-on clinical training for Ayurvedic nurses: vital signs assessment, dosha-based diet planning, herbal preparation, and patient communication.",
            "category": "Clinical Practice",
            "instructor": "Sister Priya Nair",
            "thumbnail": "https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?crop=entropy&cs=srgb&fm=jpg&q=85",
            "price_inr": 2999,
            "price_usd": 59,
            "rating": 4.9,
            "students_count": 421,
            "duration": "11h 30m",
            "featured": True,
            "tags": ["Clinical", "Nursing"],
            "lessons": [
                {"id": str(uuid.uuid4()), "title": "Clinical Assessment Methods", "type": "video", "url": "https://www.youtube.com/embed/8jPQjjsBbIc", "duration": "28:00", "order": 1},
                {"id": str(uuid.uuid4()), "title": "Patient Care Handbook", "type": "pdf", "url": "https://www.africau.edu/images/default/sample.pdf", "duration": "45 min read", "order": 2},
                {"id": str(uuid.uuid4()), "title": "Dosha-Based Diet (Doc)", "type": "word", "url": "https://file-examples.com/storage/fe52cb0c4862dc676a1b341/2017/02/file-sample_100kB.doc", "duration": "15 min read", "order": 3},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Yoga & Pranayama for Healing",
            "subtitle": "Breath, posture, meditation",
            "description": "Therapeutic yoga postures, breathing exercises, and meditation practices tailored to support Ayurvedic healing and patient recovery.",
            "category": "Yoga & Wellness",
            "instructor": "Yogacharya Ramesh",
            "thumbnail": "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=compress&cs=tinysrgb&w=940",
            "price_inr": 1299,
            "price_usd": 25,
            "rating": 4.8,
            "students_count": 1893,
            "duration": "5h 40m",
            "featured": False,
            "tags": ["Wellness", "Beginner"],
            "lessons": [
                {"id": str(uuid.uuid4()), "title": "Pranayama Basics", "type": "video", "url": "https://www.youtube.com/embed/8VwufJrUhic", "duration": "18:30", "order": 1},
                {"id": str(uuid.uuid4()), "title": "Yoga Sequences PDF", "type": "pdf", "url": "https://www.africau.edu/images/default/sample.pdf", "duration": "20 min read", "order": 2},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]
    await db.courses.insert_many(sample_courses)

    sample_quizzes = [
        {
            "id": str(uuid.uuid4()),
            "title": "Doshas Fundamentals",
            "subtitle": "Test your knowledge of Vata, Pitta, Kapha",
            "category": "Fundamentals",
            "thumbnail": "https://images.pexels.com/photos/36863397/pexels-photo-36863397.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "questions": [
                {"id": str(uuid.uuid4()), "question": "Which dosha governs movement and the nervous system?", "options": ["Vata", "Pitta", "Kapha", "Tridosha"], "correct_index": 0, "explanation": "Vata is composed of air and ether and governs all movement in the body."},
                {"id": str(uuid.uuid4()), "question": "Pitta is primarily made of which two elements?", "options": ["Earth & Water", "Fire & Water", "Air & Ether", "Fire & Air"], "correct_index": 1, "explanation": "Pitta = Fire + Water; it governs digestion and metabolism."},
                {"id": str(uuid.uuid4()), "question": "Which dosha provides structure and stability?", "options": ["Vata", "Pitta", "Kapha", "Agni"], "correct_index": 2, "explanation": "Kapha (Earth + Water) provides structure, lubrication, and stability."},
                {"id": str(uuid.uuid4()), "question": "How many doshas are there in classical Ayurveda?", "options": ["Two", "Three", "Five", "Seven"], "correct_index": 1, "explanation": "There are three doshas: Vata, Pitta, and Kapha."},
                {"id": str(uuid.uuid4()), "question": "Which season aggravates Kapha?", "options": ["Summer", "Autumn", "Late Winter / Spring", "Monsoon"], "correct_index": 2, "explanation": "Kapha accumulates in late winter and aggravates in spring."},
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Panchakarma Procedures",
            "subtitle": "Five purification therapies",
            "category": "Panchakarma",
            "thumbnail": "https://images.pexels.com/photos/6187847/pexels-photo-6187847.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "questions": [
                {"id": str(uuid.uuid4()), "question": "Vamana refers to therapeutic ___?", "options": ["Enema", "Emesis (vomiting)", "Nasal drops", "Bloodletting"], "correct_index": 1, "explanation": "Vamana = therapeutic emesis to eliminate Kapha toxins."},
                {"id": str(uuid.uuid4()), "question": "Which is the most important Panchakarma therapy according to Charaka?", "options": ["Nasya", "Basti", "Vamana", "Virechana"], "correct_index": 1, "explanation": "Basti is considered 'half-treatment' for all diseases."},
                {"id": str(uuid.uuid4()), "question": "Nasya is the administration of medicine through ___?", "options": ["Nose", "Mouth", "Rectum", "Skin"], "correct_index": 0, "explanation": "Nasya = nasal administration."},
                {"id": str(uuid.uuid4()), "question": "Raktamokshana means ___?", "options": ["Purgation", "Enema", "Bloodletting", "Emesis"], "correct_index": 2, "explanation": "Raktamokshana = therapeutic bloodletting."},
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Ayurvedic Herbs Quick Test",
            "subtitle": "Common herbs and their uses",
            "category": "Herbal Medicine",
            "thumbnail": "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=compress&cs=tinysrgb&w=940",
            "questions": [
                {"id": str(uuid.uuid4()), "question": "Ashwagandha is primarily known as a(n) ___?", "options": ["Adaptogen", "Laxative", "Diuretic", "Antiseptic"], "correct_index": 0, "explanation": "Ashwagandha is a renowned adaptogen and rasayana."},
                {"id": str(uuid.uuid4()), "question": "Triphala is a combination of how many fruits?", "options": ["Two", "Three", "Five", "Seven"], "correct_index": 1, "explanation": "Triphala = Amalaki + Bibhitaki + Haritaki."},
                {"id": str(uuid.uuid4()), "question": "Tulsi is botanically known as ___?", "options": ["Ocimum sanctum", "Withania somnifera", "Curcuma longa", "Bacopa monnieri"], "correct_index": 0, "explanation": "Tulsi = Ocimum sanctum (Holy Basil)."},
                {"id": str(uuid.uuid4()), "question": "Brahmi is used primarily for ___?", "options": ["Joints", "Skin", "Brain & memory", "Digestion"], "correct_index": 2, "explanation": "Brahmi is a famous medhya rasayana (brain tonic)."},
            ],
        },
    ]
    await db.quizzes.insert_many(sample_quizzes)

    now = datetime.now(timezone.utc)
    sample_live = [
        {
            "id": str(uuid.uuid4()),
            "title": "Live Q&A — Doshas in Modern Practice",
            "instructor": "Dr. Anjali Sharma",
            "starts_at": (now + timedelta(days=1, hours=2)).isoformat(),
            "duration_min": 60,
            "thumbnail": "https://images.pexels.com/photos/36863397/pexels-photo-36863397.jpeg?auto=compress&cs=tinysrgb&w=940",
            "description": "Open session — bring your questions about applying dosha theory in real patient care.",
            "join_url": "https://meet.google.com/",
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Hands-on: Abhyanga Workshop",
            "instructor": "Dr. Vikram Iyer",
            "starts_at": (now + timedelta(days=3, hours=4)).isoformat(),
            "duration_min": 90,
            "thumbnail": "https://images.pexels.com/photos/6187847/pexels-photo-6187847.jpeg?auto=compress&cs=tinysrgb&w=940",
            "description": "Live demo and Q&A on the traditional Ayurvedic oil massage technique.",
            "join_url": "https://meet.google.com/",
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Herbal Pharmacy Open House",
            "instructor": "Dr. Meera Krishnan",
            "starts_at": (now + timedelta(days=7)).isoformat(),
            "duration_min": 75,
            "thumbnail": "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=compress&cs=tinysrgb&w=940",
            "description": "Identify herbs, learn dosages, and ask the experts.",
            "join_url": "https://meet.google.com/",
        },
    ]
    await db.live_classes.insert_many(sample_live)

    # Seed an admin account
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        'id': admin_id,
        'name': 'Academy Admin',
        'email': 'admin@ayurveda.academy',
        'role': 'admin',
        'password': hash_pw('admin123'),
        'avatar': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
    })
    student_id = str(uuid.uuid4())
    await db.users.insert_one({
        'id': student_id,
        'name': 'Demo Student',
        'email': 'student@ayurveda.academy',
        'role': 'student',
        'password': hash_pw('student123'),
        'avatar': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
    })
    logger.info('✓ Seeded sample data')


@app.on_event('startup')
async def on_startup():
    await seed_data()
    # Migration: mark first lesson of each course as preview if not set
    async for course in db.courses.find({}):
        lessons = course.get('lessons', [])
        if lessons and not lessons[0].get('preview'):
            lessons[0]['preview'] = True
            await db.courses.update_one({'id': course['id']}, {'$set': {'lessons': lessons}})
    # Migration: backfill wallet/referral fields on existing users
    async for u in db.users.find({}):
        updates = {}
        if 'wallet_balance' not in u:
            updates['wallet_balance'] = 0
        if not u.get('referral_code'):
            updates['referral_code'] = gen_referral_code(u.get('name', 'AYR'))
        if updates:
            await db.users.update_one({'id': u['id']}, {'$set': updates})
    # Migration: backfill access_period_days on courses + expires_at on existing enrollments
    async for course in db.courses.find({}):
        if course.get('access_period_days') is None:
            await db.courses.update_one({'id': course['id']}, {'$set': {'access_period_days': 365}})
    async for e in db.enrollments.find({'expires_at': None}):
        c = await db.courses.find_one({'id': e['course_id']}, {'_id': 0})
        period = (c or {}).get('access_period_days', 365)
        if period and period > 0:
            try:
                base = datetime.fromisoformat(e['enrolled_at'].replace('Z', '+00:00'))
            except Exception:
                base = datetime.now(timezone.utc)
            await db.enrollments.update_one({'id': e['id']}, {'$set': {'expires_at': (base + timedelta(days=period)).isoformat()}})


# ============ Root ============
@api_router.get('/')
async def root():
    return {'message': 'Ayurveda Nursing Academy API'}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()

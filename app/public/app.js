async function fetchCourses(){
  const res = await fetch('/api/courses');
  return res.json();
}

async function fetchCourse(id){
  const res = await fetch(`/api/courses/${id}`);
  return res.json();
}

function el(tag, attrs={}, ...children){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{ if(k==='onclick') e.addEventListener('click', v); else e.setAttribute(k,v)});
  children.forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c)});
  return e;
}

async function showCourses(){
  const list = document.getElementById('courses-list');
  list.innerHTML = 'Loading...';
  try{
    const courses = await fetchCourses();
    list.innerHTML = '';
    courses.forEach(c=>{
      const card = el('div',{class:'course'});
      const title = el('h4',{},c.title);
      const desc = el('div',{},c.description);
      const btn = el('button',{},'View');
      btn.onclick = ()=>showCourseDetail(c.id);
      card.appendChild(title);card.appendChild(desc);card.appendChild(btn);
      list.appendChild(card);
    });
  }catch(e){ list.innerHTML = 'Failed to load courses: '+e.message }
}

async function showCourseDetail(id){
  const detail = document.getElementById('course-detail');
  const coursesSection = document.getElementById('courses');
  coursesSection.classList.add('hidden');
  detail.classList.remove('hidden');
  document.getElementById('enroll-result').textContent = '';
  try{
    const course = await fetchCourse(id);
    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-desc').textContent = course.description;
    const lessonsList = document.getElementById('lessons-list');
    lessonsList.innerHTML = '';
    course.lessons.forEach(l=>{
      const li = document.createElement('li');
      li.textContent = l.title + ' - ' + (l.content || '');
      lessonsList.appendChild(li);
    });
    document.getElementById('enroll').onclick = async ()=>{
      const userName = document.getElementById('userName').value || 'Demo Student';
      const resp = await fetch('/api/enroll',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userName,courseId:id})
      });
      const data = await resp.json();
      document.getElementById('enroll-result').textContent = JSON.stringify(data);
    }
  }catch(e){
    document.getElementById('course-title').textContent = 'Failed to load';
    document.getElementById('course-desc').textContent = e.message;
  }
}

document.getElementById('back').addEventListener('click',()=>{
  document.getElementById('course-detail').classList.add('hidden');
  document.getElementById('courses').classList.remove('hidden');
});

showCourses();

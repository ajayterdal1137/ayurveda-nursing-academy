FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
# Use npm install instead of npm ci when package-lock.json may be missing
RUN npm install --production --no-optional

COPY . .

EXPOSE 8000
CMD ["npm", "start"]

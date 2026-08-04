FROM node:24
WORKDIR /app
COPY package.json package-lock.json tsconfig.json vite.config.ts index.html ./
RUN npm ci
COPY src ./src
COPY public ./public
CMD ["npm", "run", "start-nobrowser"]

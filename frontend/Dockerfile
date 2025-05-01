FROM node:18
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
COPY public ./public
CMD ["npm", "run", "start-browser"]

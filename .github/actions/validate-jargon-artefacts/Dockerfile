FROM node:21

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY validation.js .

CMD ["node", "validation.js"]
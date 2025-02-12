FROM node:21-alpine

COPY package*.json /

RUN npm ci

COPY index.js /index.js

CMD ["node", "index.js"]
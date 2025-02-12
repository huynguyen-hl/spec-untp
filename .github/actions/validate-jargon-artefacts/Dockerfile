FROM node:21

COPY package*.json /

RUN npm ci

COPY validation.js /validation.js

CMD ["node", "/validation.js"]
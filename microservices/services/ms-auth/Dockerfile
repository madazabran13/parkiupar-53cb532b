FROM node:20-alpine

WORKDIR /workspace

COPY shared ./shared
COPY services/ms-auth ./services/ms-auth

RUN cd shared && npm install && npm run build
RUN cd services/ms-auth && npm install && npm run build

WORKDIR /workspace/services/ms-auth

EXPOSE 3001
CMD ["node", "dist/index.js"]   
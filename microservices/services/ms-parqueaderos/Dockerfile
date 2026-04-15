FROM node:20-alpine

WORKDIR /workspace

COPY shared ./shared
COPY services/ms-parqueaderos ./services/ms-parqueaderos

RUN cd shared && npm install && npm run build
RUN cd services/ms-parqueaderos && npm install && npm run build

WORKDIR /workspace/services/ms-parqueaderos

EXPOSE 3003
CMD ["node", "dist/index.js"]
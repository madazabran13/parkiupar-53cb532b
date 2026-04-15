FROM node:20-alpine

WORKDIR /workspace

COPY shared ./shared
COPY services/ms-reportes ./services/ms-reportes

RUN cd shared && npm install && npm run build
RUN cd services/ms-reportes && npm install && npm run build

WORKDIR /workspace/services/ms-reportes

EXPOSE 3005
CMD ["node", "dist/index.js"]
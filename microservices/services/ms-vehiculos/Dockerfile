FROM node:20-alpine

WORKDIR /workspace

COPY shared ./shared
COPY services/ms-vehiculos ./services/ms-vehiculos

RUN cd shared && npm install && npm run build
RUN cd services/ms-vehiculos && npm install && npm run build

WORKDIR /workspace/services/ms-vehiculos

EXPOSE 3002
CMD ["node", "dist/index.js"]
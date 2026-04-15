FROM node:20-alpine

WORKDIR /workspace

COPY shared ./shared
COPY services/ms-reservas ./services/ms-reservas

RUN cd shared && npm install && npm run build
RUN cd services/ms-reservas && npm install && npm run build

WORKDIR /workspace/services/ms-reservas

EXPOSE 3004
CMD ["node", "dist/index.js"]
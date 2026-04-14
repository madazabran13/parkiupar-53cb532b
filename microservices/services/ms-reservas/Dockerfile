FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/ms-vehiculos/package.json ./
RUN npm install --production=false
COPY services/ms-vehiculos/tsconfig.json ./
COPY services/ms-vehiculos/src/ ./src/

# Crear la estructura de directorios que los imports esperan
# Los imports usan ../../../../shared/src/ desde src/controllers/
# Eso es: /app/src/controllers/ -> /app/src/ -> /app/ -> /.. -> /../.. -> /../../shared
# Creamos el symlink en la ruta que Node.js va a resolver
RUN mkdir -p services/ms-vehiculos/src && \
    ln -s /app/shared services/ms-vehiculos/src/../../../shared || true && \
    ln -s /app/shared ../../../shared 2>/dev/null || true

RUN npx tsc
EXPOSE 3002
CMD ["node", "dist/index.js"]
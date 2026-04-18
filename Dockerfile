FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

# Receive API URL at build time so Vite can bake it into the JS bundle
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
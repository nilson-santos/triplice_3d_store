# Stage 1: Build the React application
FROM node:25-slim as build

WORKDIR /app

ARG VITE_API_URL
ARG VITE_USE_MERCADOPAGO
ARG VITE_MERCADOPAGO_PUBLIC_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_USE_MERCADOPAGO=${VITE_USE_MERCADOPAGO}
ENV VITE_MERCADOPAGO_PUBLIC_KEY=${VITE_MERCADOPAGO_PUBLIC_KEY}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA (Single Page Application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

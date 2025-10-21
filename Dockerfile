# Build stage for the Vite React application
FROM node:20-bullseye-slim AS build
WORKDIR /app

# Install dependencies based on the package manifest
COPY package*.json ./
RUN npm install

# Copy the remaining project files and produce a production build
COPY . .
RUN npm run build

# Runtime stage: serve static assets with nginx
FROM nginx:1.27-alpine AS runtime

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from the builder stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

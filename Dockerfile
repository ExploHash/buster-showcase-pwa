# Use the official NGINX base image
FROM nginx:latest

# Copy static files to NGINX default web root directory
COPY . /usr/share/nginx/html

# Remove .git directory
RUN rm -rf /usr/share/nginx/html/.git

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start NGINX server
CMD ["nginx", "-g", "daemon off;"]

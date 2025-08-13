# Use the official Node.js image to build and serve the app
FROM node:16-alpine AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies with the --legacy-peer-deps flag to handle dependency conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application files to the working directory
COPY . .

# Build the React app
RUN npm run build

# Install 'serve' globally to serve the React app
RUN npm install -g serve

# Expose port 3000 for the app to be accessed
EXPOSE 5173

# Use the "serve" command to serve the built React app
CMD ["serve", "-s", "dist", "-l", "5173"]
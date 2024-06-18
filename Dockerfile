# Use the official Node.js 14 image as a parent image
FROM node:20

# Set the working directory within the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) into the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application's code into the container
COPY . .

# Your application listens on port 3000, make sure the container does too
EXPOSE 5000

# Command to run your application
CMD ["npm", "start"]

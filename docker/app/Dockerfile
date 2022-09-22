FROM ubuntu:jammy

LABEL name="adastry-api"
LABEL description="Adastry API environment"
LABEL maintainer="https://github.com/pascallapointe"

# Define environment variables
ENV NVM_DIR="$HOME/.nvm"

WORKDIR /root

# Install base utilities and dependencies
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get install -y python-is-python3
RUN apt-get install -y automake
RUN apt-get install -y make
RUN apt-get install -y build-essential

# Install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
RUN \. "$NVM_DIR/nvm.sh"

# Install node 16.17 (npm v8.15)
RUN nvm install 16.17
RUN nvm use 16.17
RUN npm install -g npm@8.19.2

WORKDIR /app

# Install project
RUN git clone https://github.com/PaskLab/adastry-api.git .
RUN npm install
RUN npm run build


CMD ["bash"]

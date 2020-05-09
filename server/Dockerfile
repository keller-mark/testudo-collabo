FROM mkeller7/conda-starlette:python3.7

# Install packages
RUN conda install -y numpy
RUN conda install -y -c conda-forge jsonschema==2.6.0
RUN conda install -y -c conda-forge aioredis==1.2.0

# Mount code as volume for development
RUN mkdir -p /app

ENV WEB_CONCURRENCY '4'
ENV PORT 8000
ENV DEBUG '1'

COPY . /app
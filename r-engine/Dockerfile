FROM r-base:4.4.1

RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libfontconfig1-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

RUN Rscript -e "install.packages(c('optparse','ggplot2','dplyr','ggrepel','pheatmap','factoextra','RColorBrewer','scales','tibble'), repos='https://cloud.r-project.org')"

RUN Rscript -e "if (!require('BiocManager', quietly=TRUE)) install.packages('BiocManager'); \
    BiocManager::install(c('EnhancedVolcano','ComplexHeatmap','clusterProfiler'), ask=FALSE)"

COPY scripts/ /r-engine/scripts/

CMD ["Rscript", "--help"]

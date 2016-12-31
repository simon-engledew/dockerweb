FROM ubuntu:latest

RUN apt-get update \
    && apt-get install unzip \
    ;

WORKDIR /src

ADD https://chromium.googlesource.com/apps/libapps/+archive/master/hterm.tar.gz /tmp

ADD https://chromium.googlesource.com/apps/libapps/+archive/master/libdot.tar.gz /tmp

RUN mkdir hterm libdot \
    && tar -C hterm -xvpz -f /tmp/hterm.tar.gz \
    && tar -C libdot -xvpz -f /tmp/libdot.tar.gz \
    ;

RUN LIBDOT_SEARCH_PATH=$(pwd) ./libdot/bin/concat.sh -i ./hterm/concat/hterm_all.concat -o hterm_all.js

CMD ["cat", "hterm_all.js"]

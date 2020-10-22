FROM node:alpine

# Require arguments about the user/group this container uses
ARG CTN_UID
ARG CTN_GID
ARG CTN_USR
ARG CTN_GRP
ARG CTN_HOME
ARG XDG_REMOTE_HOST

RUN apk upgrade --update && \
    apk add --no-cache \
        bash \
        coreutils \
    ;

# Map the user/group this container uses to the uid/gid of YOUR user
# This ensures that:
# - the CLI user has write-access to mounted files
# - files created by it are owned by YOUR user on YOUR machine
# Thus, it eliminates ANY need for special file-modes, 0644 and 0755 will do just fine!
RUN if [ ${CTN_UID:-0} -ne 0 ] && [ ${CTN_GID:-0} -ne 0 ]; then \
        OLD_UID="$(id -u ${CTN_USR})" && \
        OLD_GID="$(id -g ${CTN_GRP})" && \
        deluser ${CTN_USR} && \
        if getent group ${CTN_GRP}; then delgroup ${CTN_GRP}; fi && \
        addgroup -g ${CTN_GID} ${CTN_GRP} && \
        adduser -D -u ${CTN_UID} -G ${CTN_GRP} -h ${CTN_HOME} ${CTN_USR} && \
        install -d -m 0755 -o ${CTN_USR} -g ${CTN_GRP} ${CTN_HOME} && \
        chown --changes --silent --no-dereference --recursive --from=${OLD_UID}:${OLD_GID} ${CTN_UID}:${CTN_GID} \
            ${CTN_HOME} \
    ;fi
USER ${CTN_USR}:${CTN_GRP}

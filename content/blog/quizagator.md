---
title: "Quizagator"
subtitle: "Deploying a Web Application with AWS and Docker"
linkTitle: "Quizagator"
slug: "quizagator"
---

In [Quizagator](https://github.com/GatorEducator/quizagator), a recent project
I contributed to, I deployed a Flask application on an Amazon Web Services EC2
instance using Docker. This was actually quite the learning experience for me
--- although I've used AWS before, both Flask and Docker were completely new.
I've heard the buzz around Docker but have not understood it until now. Docker
is clearly the best solution for ensuring production environments and
development environments are the way they should be: it's easy to set up,
repeatable, and you can even host and deploy images which recreate the exact
setup anywhere! I won't go into a description of Docker here; this article is
more about the process of automating deployment to an EC2 instance. For a good
tutorial, I recommend [docker-curriculum](https://docker-curriculum.com/).

First, there are three main problems in deploying a Web Application using
Docker: images need to be automatically built, images need to be automatically
deployed (without service interruption), and production data needs to be kept
throughout the process. I solve this with some external tools and Docker
features.

First, a Dockerfile is necessary to build an image in the first place.
Quizagator's file can be seen below. I won't go into all of the details here,
but some key things should be apparent: We install the environment first (using
[Pipenv](https://docs.pipenv.org/)), and then copy over the program code. This
ensures that Docker's caching during the build process is fully utilized --- if
`Pipfile` or `Pipfile.lock` do not change, then the environment does not need
to be recreated, and a ton of time is saved. Another detail: we expose port
`80` so that our application can actually listen to the outside world through
that port. Finally, when starting `gunicorn`, we use the `--access-logfile -`
parameter to append the log to standard output. Since Docker logs the output of
every container, this log is visible if you attach to the container or access
the logs --- a super useful thing to have, without any need for explicit data
storage or logging system!

```bash
FROM python:3.7.3-alpine
MAINTAINER gkapfham@allegheny.edu
ENV APP_DIR /quizagator/
# create and use the quizagator directory
WORKDIR ${APP_DIR}
# copy over the pipfile to set up the environment
COPY Pipfile Pipfile.lock ${APP_DIR}
# install pipenv and dependencies into the image's system python
# (Don't use pipenv run to run things)
RUN set -ex && pip install pipenv && pipenv install --deploy --system
# Copy the current folder to /quizagator in the image
# This should include Pipfile.lock
COPY . ${APP_DIR}
EXPOSE 80
# the start command will run the production server
CMD ["gunicorn", "--workers", "3", "--access-logfile", "-", "--bind", "0.0.0.0:80", "application.wsgi:app"]
```

Now that we have a Docker image, we need to automate the process of building
that image. Docker hosts an excellent service, [Docker
Hub](https://hub.docker.com/), that can watch a GitHub or GitLab repository and
build an image when certain conditions are met. We utilized that to build a new
image from our Dockerfile whenever a new push happened on `master`, or a push
was tagged with a semver (like v1.0.1); these settings automatically create
both version and latest tags for the Docker image. Anyone can now download an
image of Quizagator with a simple `docker pull
gatoreducator/quizagator:latest`, and the [Docker Hub
repository](https://hub.docker.com/r/gatoreducator/quizagator) will provide the
`latest` tag; `latest` can be changed for a semantic version to get specific
previous versions as well.

The second problem we tackle with the help of a recently revived utility called
[Watchtower](https://github.com/containrrr/watchtower). This program, written
in Golang, runs as a daemon (or optionally once) and checks Docker Hub for new
changes in the currently running Docker containers. Then, if a new `latest`
tagged image is detected, Watchtower uses the Docker API to shut down the old
image, pull the new image, and then start up a new container: all settings and
other Docker configurations are kept from the previous container, so as long as
the container is stateless, there is no interruption besides a slight delay as
containers are switched. This is an incredibly useful tool, and we'll use it to
automatically update the running image on an EC2 instance used as a Docker
Host.

Finally, we have the production data. Notice what I said in the previous
paragraph: a container must be *stateless* to benefit from the features of
Watchtower; in fact, Docker containers should always be stateless according to
the Docker documentation. For a Flask Web Application, this means that we must
have some external data storage. While another Docker container running an SQL
server might work, that container would then be stateful, and thus we should
avoid that as well. Instead, for both simplicity and ease of understanding, we
decided to host an SQLite3 database on the EC2 instance itself, not behind any
Docker container but simply in the server itself. We communicate with this
database in the Flask app by using a bind mount.

There are a few different ways to get data into Docker containers: one of the
oldest and simplest is the bind mount. This simply creates a link between a
file or folder in the container and one outside the container. Using a bind
mount we simply give the container access to a folder on the actual EC2 server,
and any non-transient data can be stored there; a database is not even needed,
as any files would persist! This enables a wide variety of options, more than
the traditional separate SQL server or RDS connection.

The setup on the EC2 instance is extremely simple. First, we need to do some
organization for our system: we'll create a `quizagator` and `watchtower`
folder in the main user folder, and a `data` folder inside `quizagator` for any
non-transient data. Depending on the EC2 image you're using, this process may
differ. We're using Amazon Linux 2, which I recommend highly for its simplicity
and lightweight nature. Before doing any of these steps, we'll also need to
install Docker itself, which is as simple as `sudo yum install docker` on
Amazon Linux. A slight addition is needed to ensure your user has access to the
Docker CLI: `sudo usermod -aG docker $USER` will ensure that your user is added
to the `docker` group, and can run `docker` commands.

Now that we have Docker available, we need to start up Quizagator and then
Watchtower to automatically update it. I've written two simple scripts, which
you can see below, that can be manually run to start up the process. After they
are started Quizagator is live, and when any changes are pushed to the master
branch of the GitHub repository they are automatically reflected in the live
image once everything builds and Watchtower triggers (my script triggers
Watchtower every 10 minutes). Even if the server reboots, Docker will
automatically restart the containers with the policy used in these scripts.

`start-quizagator.sh`:

```
#!/bin/sh
NAME="quizagator"
DATA_FOLDER="$HOME/quizagator/data"
IMAGE_NAME="gatoreducator/quizagator"
TAG="latest"
IMAGE="$IMAGE_NAME:$TAG"
INNER_PORT="80"
OUTER_PORT="80"
KEY="<secure-production-key-REPLACE>"

docker run -d --restart unless-stopped -e "FLASK_SECRET_KEY=$KEY" \
    -p "${OUTER_PORT}:${INNER_PORT}" --name "$NAME" \
    --mount "type=bind,source=$DATA_FOLDER,target=/data" \
    "$IMAGE"
```

`start-watchtower.sh`:

```
#!/bin/sh
docker run -d --restart always --name watchtower \
    -v /var/run/docker.sock:/var/run/docker.sock \
    containrrr/watchtower --cleanup --schedule "*/10 * * * *"
```

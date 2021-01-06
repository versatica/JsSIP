## What you need to build JsSIP

This document details the steps for building JsSIP using a [Docker]
container.

You will need to have Docker engine installed and the correct permissions to
run containers. The container will have all of the dependencies installed.

### Cloning the repository

Clone a copy of the main JsSIP git repository by running:

```bash
$ git clone https://github.com/versatica/JsSIP.git JsSIP
$ cd JsSIP
```

### Building the container

From the same directory in which the `dockerfile` is located, enter the
following command.

```bash
docker build -t my-jssip .
```

* You can replace `my-jssip` with whatever name you wish.
* Note there is a space followed by a period following `my-jssip` in the above
command

### Building the `dist` folders

To generate the `dist` folders run the following command

```bash
docker run my-jssip gulp dist
```
or
```bash
docker run my-jssip gulp
```

where `my-jssip` is the same as the value you created when building the
container.

This will generate the following files (in the container)

* `dist/jssip.js`: uncompressed version of JsSIP.
* `dist/jssip.min.js`: compressed version of JsSIP.

### Running the unit tests

The unit tests can be run with the following command

```bash
docker run my-jssip gulp test
```
where `my-jssip` is the same as the value you created when building the
container.

### SSHing onto the container
If you have the need to access the container running JsSIP then you can enter
the following command

```bash
docker run -it my-jssip bash
```
where `my-jssip` is the same as the value you created when building the
container.

This will give you an ssh session on the container. You will be put into the
`/usr/jssip` folder by default, which is where the JsSIP files are located.
To exit from the container type in
```bash
exit
```

### Volume Mapping
You can mount your local host so that it mirrors the files in the container. To
do this enter the following command

```bash
docker run -v $PWD/.:/usr/jssip -it my-jssip bash
```
where `my-jssip` is the same as the value you created when building the
container.

The `-v -v $PWD/.:/usr/jssip` part can be used on any of the docker run
commands above.

## Development

### Changes in JsSIP Grammar

If you modify `lib/Grammar.pegjs` then you need to recompile it:

```bash
docker run my-jssip gulp devel
docker run my-jssip gulp dist
```

[docker]: https://www.docker.com/

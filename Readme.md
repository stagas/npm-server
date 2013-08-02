
# npm-server

local npm registry w/ real registry fallback

## Features

- Install packages from a local dir.
- Fallback to real registry for foreign modules and everything else.

## Install

```sh
$ npm install npm-server -g
```

## Usage

```

  Usage: npm-server [options] [dir]

  Options:

    -h, --help          output usage information
    -V, --version       output the version number
    -H, --host <value>  server host [localhost]
    -p, --port <value>  server port [6070]
    -e, --expire <sec>  cache expire time [60]

```

## Example

Run the registry server:

```sh
$ npm-server
```

Then install packages, instructing npm to use our registry:

```sh
$ npm --registry=http://localhost:6070/ install colors
```

Or, you can also use it permanently:

```sh
$ npm set registry http://localhost:6070/
```

## WARNING

This project is a DEVELOPMENT tool. It does not aim to be 100% compliant with the npm registry. The only command implemented is `install`. The rest of npm commands like `publish`, `adduser`, `owner` etc. will be forwarded to the REAL npm registry, so use with caution. You've been warned.

## License

MIT

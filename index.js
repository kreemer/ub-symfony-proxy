#! /usr/bin/env node

const http = require("http");
const fs = require('fs').promises;
const os = require("os");

const argv = require('yargs/yargs')(process.argv.slice(2))
    .count('verbose')
    .alias('v', 'verbose')
    .default('port', 7200)
    .usage('Usage: $0 [--port num] [-v|--verbose]')
    .argv;



const userHomeDir = os.homedir();

const host = 'localhost';
const port = argv.port;

if (argv.verbose) {
    console.log("Start in verbose mode");
}

fs.readFile(userHomeDir + "/.symfony5/proxy.json")
    .then(contents => {

        if (argv.verbose) {
            console.log("Found proxy.json");
        }

        const obj = JSON.parse(contents);

        if (argv.verbose) {
            console.log("proxy.json is valid json");
        }

        let urlList = [];
        const domainList = Object.keys(obj.domains);
        for (let i = 0; i < domainList.length; i++) {
            let url = domainList[i] + "." + obj.tld;

            if (argv.verbose) {
                console.log("Adding `" + url + "` to list of proxied urls");
            }
            
            urlList.push(domainList[i] + "." + obj.tld);
        }

        const urlString = JSON.stringify(urlList);
        const pacFile = ` 
// Only proxy *.unibe.ch requests
// Configuration file in ~/.symfony5/proxy.json
function FindProxyForURL (url, host) {
    if (!dnsDomainIs(host, '.unibe.ch')) {
        return 'DIRECT';
    }

    let list = ${urlString}

    for (let i = 0; i < list.length; i++) {
        if (host == list[i]) {
            return 'PROXY localhost:7080'
        }
    }
            
    return 'DIRECT';
}`;


        const requestListener = function (req, res) {
            if (argv.verbose) {
                const ip = req.socket.localAddress;
                const port = req.socket.localPort;
                console.log("Request received from %s:%d", ip, port);
            }
            
            res.setHeader("Content-Type", "application/x-ns-proxy-autoconfig");
            res.writeHead(200);
            res.end(pacFile);
        };

        const server = http.createServer(requestListener);
        server.listen(port, host, () => {
            console.log(`Server is running on http://${host}:${port}`);
        });

    })
    .catch(() => {
        console.error("Did not found `" + userHomeDir + "/.symfony5/proxy.json` file");
        return 1;
    });



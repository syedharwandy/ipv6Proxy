import express from 'express'
import shell from 'shelljs'
import Queue from './dataQueue.js'
import { Mutex } from 'async-mutex'

const httpQue = new Queue()
const app = express()
const mutex = new Mutex()
const serverPort = 4000
const totalPortNeedToBuffer = 2000
const username = 'myipv6Proxy'
const password = 'AAAA@1176@'

//Create HttpPort
for (let x = 1; x <= totalPortNeedToBuffer; x++) {
	httpQue.enqueue(10000 + x)
}

//Used Express JSON
app.use(express.json())
//Start IPV6 Proxy
app.get('/startProxy', (req, res) => {
	mutex.acquire().then(function (release) {
		shell.echo(`Creating IPV6 Proxy Starting ${serverPort}`)
		shell
			.ShellString(
				'nscache 65536\nnserver 1.1.1.1\nnserver 1.0.0.1\n\nconfig /conf/3proxy.cfg\nmonitor /conf/3proxy.cfg\n\ncounter /count/3proxy.3cf\nusers $/conf/passwd\n\ninclude /conf/counters\ninclude /conf/bandlimiters\n\nauth strong\nallow *\n\n'
			)
			.to('/usr/local/3proxy/conf/3proxy.cfg') //New Cfg File

		shell.chmod(700, '/usr/local/3proxy/conf/3proxy.cfg')
		shell.exec(`systemctl stop 3proxy.service`)
		shell.exec(`systemctl start 3proxy.service`)

		res.send('Proxy Restart')
		release()
	})
})
//Set Ipv6 Proxy
app.post('/setIpv6proxy', (req, res) => {
	mutex.acquire().then(function (release) {
		let ipv6Address = req.body['Ipv6 Address']
		const localIp = req.body['Local IP']

		//Get Random Available Http Port
		const httpPort = httpQue.dequeue()
		const socksPort = httpPort + 10000

		shell.echo(`Setup New Ipv6 Using Port [H:${httpPort}|S:${socksPort}] For [${ipv6Address}]`)

		//Remove Used Port
		const newRegexHttp = new RegExp(`.*-p${httpPort}.*`, 'd') //Working
		const newRegexSocks = new RegExp(`.*-p${socksPort}.*`, 'd') //Working
		shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
		shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')

		// console.log(currentPort)
		shell.exec(`ip -6 addr add ${ipv6Address}/64 dev ens32`)
		shell.ShellString(`proxy -p${httpPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Http
		shell.ShellString(`socks -p${socksPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Socks

		shell.exec(`ufw allow ${httpPort}`)
		shell.exec(`ufw allow ${socksPort}`)

		res.json({
			'Local IP': localIp,
			HttpPort: httpPort,
			SocksPort: socksPort,
			'Ipv6 Address': ipv6Address,
			Username: username,
			Password: password,
		})
		release()
	})
})
app.listen(serverPort)
console.log('Starting my ipv6Proxy using port 4000')

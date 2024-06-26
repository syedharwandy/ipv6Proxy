import express from 'express'
import shell from 'shelljs'
import Queue from './dataQueue.js'
import { Mutex } from 'async-mutex'

const setTimeoutID = {}
const httpQue = new Queue()
const app = express()
const mutex = new Mutex()
const serverPort = 4000
const totalPortNeedToBuffer = 100
const username = 'syedharwandy'
const password = 'Asyraf1994'

//Create HttpPort
for (let x = 1; x <= totalPortNeedToBuffer; x++) {
	httpQue.enqueue(10000 + x)
}
//Function To Remove Ipv6
function autoRemoveConnection(httpPort, socksPort, ipv6Address) {
	const timeOutID = setTimeout(() => {
		mutex.acquire().then(function (release) {
			shell.echo(`Remove Unused Port [H:${httpPort}|S:${socksPort}] For [${ipv6Address}]`)
			//Remove Port From File
			const newRegexHttp = new RegExp(`.*-p${httpPort}.*`, 'd') //Working
			const newRegexSocks = new RegExp(`.*-p${socksPort}.*`, 'd') //Working
			shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
			shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')

			shell.exec(`ip -6 addr del ${ipv6Address}/64 dev enp0s3`)

			httpQue.enqueue(httpPort)

			release()
		})
	}, 10 * 60000)

	setTimeoutID[ipv6Address] = { timeOutID: timeOutID, httpPort: httpPort, socksPort: socksPort }
}
//Used Express JSON
app.use(express.json())
//Start IPV6 Proxy
app.get('/startProxy', (req, res) => {
	mutex.acquire().then(function (release) {
		shell.echo(`Start IPV6 PROXY Using Port ${serverPort}`)
		shell
			.ShellString(
				'nscache 65536\nnserver 8.8.8.8\nnserver 8.8.4.4\n\nconfig /conf/3proxy.cfg\nmonitor /conf/3proxy.cfg\n\ncounter /count/3proxy.3cf\nusers $/conf/passwd\n\ninclude /conf/counters\ninclude /conf/bandlimiters\n\nauth strong\nallow *\n\nproxy -n\n\n'
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

		//Check TimeOut Have Been Set Or Not
		if (setTimeoutID?.[ipv6Address]?.['timeOutID']) {
			shell.echo(`Clear All Port And Ipv6 Timeout`)

			clearTimeout(setTimeoutID[ipv6Address]['timeOutID'])
			const data = setTimeoutID[ipv6Address]

			const newRegexHttp = new RegExp(`.*-p${data['httpPort']}.*`, 'd') //Working
			const newRegexSocks = new RegExp(`.*-p${data['socksPort']}.*`, 'd') //Working

			shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
			shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')

			if (data['httpPort'] !== httpPort) {
				httpQue.enqueue(data['httpPort'])

				shell.exec(`ufw deny ${data['httpPort']}`) // Disallow Port Used Http
				shell.exec(`ufw deny ${data['socksPort']}`) // Disallow Port Used Sock
			}

			delete setTimeoutID[ipv6Address]
		}

		shell.echo(`Setup New Ipv6 Using Port [H:${httpPort}|S:${socksPort}] For [${ipv6Address}]`)

		//Remove Used Port
		const newRegexHttp = new RegExp(`.*-p${httpPort}.*`, 'd') //Working
		const newRegexSocks = new RegExp(`.*-p${socksPort}.*`, 'd') //Working
		shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
		shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')

		// console.log(currentPort)
		shell.exec(`ip -6 addr add ${ipv6Address}/64 dev enp0s3`)
		shell.ShellString(`proxy -p${httpPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Http
		shell.ShellString(`socks -p${socksPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Socks

		shell.exec(`ufw allow ${httpPort}`)
		shell.exec(`ufw allow ${socksPort}`)

		autoRemoveConnection(httpPort, socksPort, ipv6Address)

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
//Remove Unused IPV6
app.post('/removeIpv6proxy', (req, res) => {
	mutex.acquire().then(function (release) {
		const ipv6Address = req.body['Ipv6 Address']

		//Check TimeOut Have Been Set Or Not
		if (setTimeoutID?.[ipv6Address]?.['timeOutID']) {
			shell.echo(`Clear All Port And Ipv6 Timeout`)

			clearTimeout(setTimeoutID[ipv6Address]['timeOutID'])
			const data = setTimeoutID[ipv6Address]

			const newRegexHttp = new RegExp(`.*-p${data['httpPort']}.*`, 'd') //Working
			const newRegexSocks = new RegExp(`.*-p${data['socksPort']}.*`, 'd') //Working
			const newRegexRemoveEmpty = new RegExp(`.*^$.*`, 'd') //Not Sure

			shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
			shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')
			shell.sed('-i', newRegexRemoveEmpty, '', '/usr/local/3proxy/conf/3proxy.cfg') // Remove Empty Line

			shell.exec(`ufw deny ${data['httpPort']}`) // Disallow Port Used Http
			shell.exec(`ufw deny ${data['socksPort']}`) // Disallow Port Used Sock

			httpQue.enqueue(data['httpPort'])
			delete setTimeoutID[ipv6Address]

			shell.echo(`Remove Used Ipv6 [${ipv6Address}] $ Total Que Port : ${httpQue.length()}`)
			res.send('Ipv6 Proxy Remove')
		} else {
			shell.echo(`Cannot Found Used Ipv6 [${ipv6Address}] Inside TimeOut`)
			res.send('[Fail] Try To Remove Ipv6 Proxy Fail')
		}

		release()
	})
})

app.listen(serverPort)

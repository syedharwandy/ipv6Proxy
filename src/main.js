import express from 'express'
import shell from 'shelljs'
import Queue from './dataQueue.js'
import asyncHandler from 'express-async-handler'
import { Mutex } from 'async-mutex'

const httpQue = new Queue()
const app = express()
const mutex = new Mutex()
const serverPort = 4000
const totalPortNeedToBuffer = 100
const username = 'syedharwandy'
const password = 'Asyraf1994'

//shelljs Exec Promises
async function runShellexec(command) {
	return await new Promise((resolve, reject) => {
		shell.exec(command, { async: true }, (code, stdout, stderr) => {
			if (!code) {
				return resolve(stdout)
			}
			return reject(stderr)
		})
	})
}
//Function To Remove Ipv6
function autoRemoveConnection(httpPort, socksPort, ipv6Address) {
	setTimeout(async () => {
		const release = await mutex.acquire()
		try {
			shell.echo(`Remove Unused Port [H:${httpPort}|S:${socksPort}] For [${ipv6Address}]`)
			//Remove Port From File
			const newRegexHttp = new RegExp(`.*-p${httpPort}.*`, 'd') //Working
			const newRegexSocks = new RegExp(`.*-p${socksPort}.*`, 'd') //Working
			shell.sed('-i', newRegexHttp, '', '/usr/local/3proxy/conf/3proxy.cfg')
			shell.sed('-i', newRegexSocks, '', '/usr/local/3proxy/conf/3proxy.cfg')

			await runShellexec(`ip -6 addr del ${ipv6Address}/64 dev enp0s3`)

			httpQue.enqueue(httpPort)
		} finally {
			release()
		}
	}, 10 * 60000)
}
//Create HttpPort
for (let x = 1; x <= totalPortNeedToBuffer; x++) {
	httpQue.enqueue(10000 + x)
}
//Used Express JSON
app.use(express.json())
//Start IPV6 Proxy
app.get(
	'/startProxy',
	asyncHandler(async (req, res) => {
		shell.echo(`Start IPV6 PROXY Using Port ${serverPort}`)
		shell
			.ShellString(
				'nscache 65536\nnserver 8.8.8.8\nnserver 8.8.4.4\n\nconfig /conf/3proxy.cfg\nmonitor /conf/3proxy.cfg\n\ncounter /count/3proxy.3cf\nusers $/conf/passwd\n\ninclude /conf/counters\ninclude /conf/bandlimiters\n\nauth strong\nallow *\n\nproxy -n\n\n'
			)
			.to('/usr/local/3proxy/conf/3proxy.cfg') //New Cfg File

		shell.chmod(700, '/usr/local/3proxy/conf/3proxy.cfg')
		await runShellexec(`systemctl stop 3proxy.service`)
		await runShellexec(`systemctl start 3proxy.service`)

		res.send('Proxy Restart')
	})
)
//Set Ipv6 Proxy
app.post(
	'/setipv6proxy',
	asyncHandler(async (req, res) => {
		const release = await mutex.acquire()
		try {
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
			await runShellexec(`ip -6 addr add ${ipv6Address}/64 dev enp0s3`)
			shell.ShellString(`proxy -p${httpPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`).toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Http
			shell
				.ShellString(`socks -p${socksPort} -a -n -6 -i0.0.0.0 -e${ipv6Address}\n`)
				.toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Socks

			await runShellexec(`ufw allow ${httpPort}`)
			await runShellexec(`ufw allow ${socksPort}`)

			autoRemoveConnection(httpPort, socksPort, ipv6Address)

			res.json({
				LocalIp: localIp,
				HttpPort: httpPort,
				SocksPort: socksPort,
				Ipv6Address: ipv6Address,
				Username: username,
				Password: password,
			})
		} finally {
			release()
		}
	})
)

app.listen(serverPort)

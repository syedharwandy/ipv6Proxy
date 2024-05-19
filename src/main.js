import express from 'express'
import shell from 'shelljs'
const app = express()

const availableHttpPort = ['1000', '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010']
const availableSocksPort = ['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010']
const username = 'syedharwandy'
const password = 'Asyraf1994'

app.use(express.json())

app.get('/', (req, res) => {
	res.json({ Ip: '192.168.0.1', Port: '1223', Username: 'syedafs', Password: '123213213' })
})

app.get('/restartProxy', (req, res) => {
	shell.exec(`systemctl stop 3proxy.service`)
	shell.exec(`systemctl start 3proxy.service`)
	res.send('Proxy Restart')
})

//Set Ipv6 Proxy
app.post('/setipv6proxy', async (req, res) => {
	const ipv6Address = await req.body['Ipv6 Address']
	const localIp = await req.body['Local IP']

	//Get Random Available Http Port
	const arrayHttpPortIndex = Math.floor(Math.random() * (availableHttpPort.length - 1))
	const currentHttpPort = availableHttpPort[arrayHttpPortIndex]
	availableHttpPort.splice(arrayHttpPortIndex, 1)

	//Get Random Available Socks Port
	const arraySockPortIndex = Math.floor(Math.random() * (availableSocksPort.length - 1))
	const currentSockPort = availableSocksPort[arraySockPortIndex]
	availableSocksPort.splice(arraySockPortIndex, 1)

	// console.log(currentPort)
	shell
		.ShellString(`proxy -p${currentHttpPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}\n`)
		.toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Http
	shell
		.ShellString(`socks -p${currentSockPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}\n`)
		.toEnd('/usr/local/3proxy/conf/3proxy.cfg') //Socks
	shell.exec(`ip -6 addr add ${await ipv6Address}/64 dev enp0s3`)

	res.json({
		LocalIp: localIp,
		HttpPort: currentHttpPort,
		SocksPort: currentSockPort,
		Ipv6Address: await ipv6Address,
		Username: username,
		Password: password,
	})
})
//Remove Ipv6 Proxy
app.post('/removeipv6proxy', async (req, res) => {
	const httpPort = req.body['HttpPort']
	const socksPort = req.body['SocksPort']
	const ipv6Address = req.body['Ipv6Address']

	shell.sed('-i', `proxy -p${httpPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}`, '', '/usr/local/3proxy/conf/3proxy.cfg')
	shell.sed('-i', `socks -p${socksPort} -a -n -6 -i0.0.0.0 -e${await ipv6Address}`, '', '/usr/local/3proxy/conf/3proxy.cfg')

	shell.exec(`ip -6 addr del ${await ipv6Address}/64 dev enp0s3`)
	res.send('Ipv6 Address Remove')
})

app.listen(4000, () => {
	console.log('Listen To 4000')
})

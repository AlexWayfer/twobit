const _ = require('lodash')
const commons = require('../libs/commons')
const permissions = require('../libs/permissions')
const { io } = require("../libs/panel")
const shortEnglish = require('humanize-duration').humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      h: () => 'h',
    }
  },
  units: ['h'],
  spacer: '',
  maxDecimalPoints: 2,
  decimal: '.'
})

class Message {
  permissions = ['broadcaster', 'moderator', 'subscriber', 'vip', 'viewer']

  constructor() {
    this.cooldowns = []
    this.commands = []
    this.sockets()
    this.getCommands()
  }
  async prepareCommand (command, message, userstate) {
    let find = this.commands.find(o => o.name === command || (o.aliases && o.aliases.includes(command)) )
    if (!find) return
    if (this.cooldowns.includes(find.name) && find.cooldowntype === 'stop') {
      return console.log(`COMMAND ${find.name.toUpperCase()} ON COOLDOWN AND HAS NO EXECUTE MODEL`)
    }

    if (await permissions.hasPerm(userstate.badges, find.permission)) await this.prepareMessage(find, find.response, message, userstate)
  }
  async prepareMessage (command, response, message, userstate) {
    let numbersRegexp = /[random]+\((.*?)\)/
    let variableRegexp = /\$_(\S*)/g
    let songRegexp = /\$song(\S*)/g
    let args = message.split(' ')
    // модер меняет переменную в команде
    let wantsChangeVariable = (userstate.mod || (userstate.badges && typeof userstate.badges.broadcaster !== 'undefined')) && args.length >= 2 && command.response.match(variableRegexp) !== null
    if (wantsChangeVariable) {
      args.shift()
      args = args.join(' ')
      let variable = response.match(variableRegexp)[0].replace('$_', '')
      let findVariable = await global.db('systems.variables').where('name', variable).update('value', args)
      if (findVariable) return this.say(`@${userstate['display-name']} переменная ${variable} изменена на ${args}`)
    }
    //
    response = response.replace('$sender', '@' + userstate['display-name'])
    if (response.includes('$uptime')) {
      response = response.replace('$uptime', commons.prepareUptime())
    }
    if (response.includes('$followtime')) {
      response = response.replace('$followtime', await commons.prepareFollowTime(Number(userstate['user-id'])))
    }
    if (response.includes('$subs')) {
      response = response.replace('$subs', global.tmi.subscribers)
    }
    if (response.includes('$latestSub')) {
      response = response.replace('$latestSub', await commons.getLatestSubOrResub('sub'))
    }
    if (response.includes('$latestReSub')) {
      response = response.replace('$latestReSub', await commons.getLatestSubOrResub('resub'))
    }
    if (response.includes('$commands')) {
      response = response.replace('$commands', this.commands.map(val => { return '!' + val.name }).join(", "))
    }
    if (response.includes('$song')) {
      let query = response.match(songRegexp)[0].replace('$song?', '')
      response = response.replace(response.match(songRegexp), await commons.getSong(query))
    }
    if (response.includes('$messages') || response.includes('$tips') || response.includes('$bits') || response.includes('$points') || response.includes('$watched') ) {
      let user = await global.db('users').where({ id: Number(userstate['user-id']) })
      if (!user.length) return
      user = user[0]
      response = response.replace('$messages', user.messages)
      response = response.replace('$tips', user.tips)
      response = response.replace('$bits', user.bits)
      response = response.replace('$points', user.points)
      response = response.replace('$watched', shortEnglish(user.watched))
    }
    if (response.includes('$top_messages')) {
      let users = await global.db('users').select('*').orderBy('messages', 'desc').limit(10)
      users = users.map(o => `${o.username} - ${o.messages}`)
      response = response.replace('$top_messages', users.join(', '))
    }
    if (response.includes('$top_watched')) {
      let users = await global.db('users').select('*').orderBy('watched', 'desc').limit(10)
      users = users.map(o => `${o.username} - ${shortEnglish(o.watched)}`)
      response = response.replace('$top_watched', users.join(', '))
    }
    if (response.includes('$top_bits')) {
      let users = await global.db('users').select('*').orderBy('bits', 'desc').limit(10)
      users = users.map(o => `${o.username} - ${o.bits}`)
      response = response.replace('$top_bits', users.join(', '))
    }
    if (response.includes('$top_tips')) {
      let users = await global.db('users').select('*').orderBy('tips', 'desc').limit(10)
      users = users.map(o => `${o.username} - ${o.tips}`)
      response = response.replace('$top_tips', users.join(', '))
    }
    if (response.includes('$top_points')) {
      let users = await global.db('users').select('*').orderBy('points', 'desc').limit(10)
      users = users.map(o => `${o.username} - ${o.points}`)
      response = response.replace('$top_points', users.join(', '))
    }
    if (response.includes('(api|')) {
      response = await commons.parseMessageApi(response)
    }
    if (response.includes('(eval')) {
      response = (await commons.eval(response, userstate.username, userstate['display-name'])).toString()
    }
    if (response.includes('$random')) {
      let numbers = response.replace('$random', 'random').match(numbersRegexp)[1]
      numbers = numbers.split('-')
      numbers = _.random(numbers[0], numbers[1])
      response = response.replace('$', '').replace(/[random]+\((.*?)\)/, numbers)
    }
    // реплейсить кастомную переменную на значение
    if (response.match(variableRegexp)) {
      for (let [index, variable] of response.match(variableRegexp).entries()) {
        let findVariable = (await global.db('systems.variables').where('name', variable.replace('$_', '')))[0]
        response = findVariable ? response.replace(variable, findVariable.value) : response + ''
      }
    }
    //
    this.respond(command, response, message, userstate)
  }
  async respond (command, message, object, userstate) {
    if (this.cooldowns.includes(command.name) && (userstate.mod || userstate.subscriber)) {
      return await this.say(message)
    } else if (this.cooldowns.includes(command.name) && command.cooldowntype === 'notstop') {
      return await this.whisper(userstate.username, message)
    }
    await this.say(message)
    this.cooldowns.push(command.name)
    setTimeout(() => {
      let index = this.cooldowns.indexOf(command.name)
      if (index !== -1) this.cooldowns.splice(index, 1)
    }, command.cooldown * 1000);
  }
  async getCommands() {
    let query = await global.db.select(`*`).from('systems.commands')
    this.commands = query
    return query
  }
  async say(msg) {
    global.tmi.client.say(process.env.TWITCH_CHANNEL, msg).catch(console.log)
  }
  async whisper(username, message) {
    await global.tmi.client.whisper(username, message).catch(console.log)
  }
  async timeout(username, time) {
    global.tmi.client.timeout(process.env.TWITCH_CHANNEL, username, time).catch(console.log)
  }
  async sockets() {
    let self = this
    io.on('connection', function (socket) {
      socket.on('list.commands', async (data, cb) => {
        let query = await global.db.select(`*`).from('systems.commands')
        cb(null, query)
      })
      socket.on('create.command', async (data, cb) => {
        let aliases = _.flattenDeep(self.commands.map(o => o.aliases))
        let names = self.commands.map(o => o.name)

        if (aliases.some(o => data.aliases.includes(o)) || names.some(o => data.aliases.includes(o))) return cb('Command name or aliase already used', null)
        if (names.some(o => o.name === data.name) || aliases.some(o => names.includes(o))) return cb('Command name or aliase already used', null)
        
        try {
          await global.db('systems.commands').insert(data)
          self.getCommands()
          cb(null, true)
        } catch (e) {
          console.log(e)
        }
      })
      socket.on('delete.command', async (data, cb) => {
        try {
          await global.db('systems.commands').where('name', data).delete()
          self.getCommands()
        } catch (e) {
          console.log(e)
        }
      })
      socket.on('update.command', async (data, cb) => {
        let aliases = _.flattenDeep(self.commands.map(o => o.aliases))
        let names = self.commands.map(o => o.name)

        if (aliases.some(o => data.aliases.includes(o)) || names.some(o => data.aliases.includes(o))) return cb('Command name or aliase already used', null)
        if (names.some(o => o.name === data.name) || aliases.some(o => names.includes(o))) return cb('Command name or aliase already used', null)
        
        let name = data.currentname
        delete data.currentname
        try {
          await global.db('systems.commands').where('name', name).update(data)
          self.getCommands()
          cb(null, true)
        } catch (e) {
          console.log(e)
        }
      })
    })
  }
}

module.exports = new Message()
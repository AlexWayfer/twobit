exports.seed = function (knex) {
  return Promise.all([
    knex('systems.moderation').select().where('name', 'links').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'links', enabled: false, settings: { moderateSubscribers: false, timeout: 600 } })
    }),
    knex('systems.moderation').select().where('name', 'symbols').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'symbols', enabled: false, settings: { moderateSubscribers: false, triggerLength: 20, maxSymbolsPercent: 65, timeout: 600 } })
    }),
    knex('systems.moderation').select().where('name', 'longMessage').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'longMessage', enabled: false, settings: { moderateSubscribers: false, triggerLength: 300, timeout: 600 } })
    }),
    knex('systems.moderation').select().where('name', 'caps').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'caps', enabled: false, settings: { moderateSubscribers: false, triggerLength: 300, maxCapsPercent: 50, timeout: 600 } })
    }),
    knex('systems.moderation').select().where('name', 'color').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'color', enabled: false, settings: { moderateSubscribers: false, timeout: 600 } })
    }),
    knex('systems.moderation').select().where('name', 'emotes').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'emotes', enabled: false, settings: { moderateSubscribers: false, maxCount: 6, timeout: 600 } })
    }),
    knex('systems.moderation').select().where('name', 'main').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'main', enabled: false, settings: { salt: 123 } })
    }),
    knex('systems.moderation').select().where('name', 'blacklist').then((rows) => {
      if (rows.length > 0) return
      return knex('systems.moderation').insert({ name: 'blacklist', enabled: true, settings: { list: [] } })
    }),
    knex('core.subscribers').select().where('name', 'count').then((rows) => {
      if (rows.length > 0) return
      return knex('core.subscribers').insert({ name: 'count', value: '0' })
    }),
    knex('core.subscribers').select().where('name', 'latestSubscriber').then((rows) => {
      if (rows.length > 0) return
      return knex('core.subscribers').insert({ name: 'latestSubscriber', value: 'n/a' })
    }),
    knex('core.subscribers').select().where('name', 'latestReSubscriber').then((rows) => {
      if (rows.length > 0) return
      return knex('core.subscribers').insert({ name: 'latestReSubscriber', value: 'n/a' })
    }),
    knex('core.tokens').select().where('name', 'bot').then((rows) => {
      if (rows.length > 0) return
      return knex('core.tokens').insert({ name: 'bot', value: 'noinformation' })
    }),
    knex('core.tokens').select().where('name', 'broadcaster').then((rows) => {
      if (rows.length > 0) return
      return knex('core.tokens').insert({ name: 'broadcaster', value: 'noinformation' })
    }),
    knex('settings').select().where('system', 'users')
      .then((rows) => {
        if (rows.length > 0) return
        return knex('settings').insert({ system: 'users', data: { enabled: false, pointsPerMessage: 0, pointsPerTime: 0 } })
      }),
    knex('integrations').select().where('name', 'donationalerts')
      .then((rows) => {
        if (rows.length > 0) return
        return knex('integrations').insert({ name: 'donationalerts', enabled: false, settings: { token: null } })
      })]);
};

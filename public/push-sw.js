/*
 * Écoute des notifications, greffée dans le service worker généré.
 *
 * vite-plugin-pwa fabrique le service worker (mode generateSW) : on ne peut
 * pas y écrire directement, mais `workbox.importScripts` permet d'y coller ce
 * fichier. C'est la raison de cette pièce détachée plutôt que d'un passage en
 * injectManifest, qui aurait demandé de reprendre à la main tout le précache.
 *
 * Le contenu du message est décidé par l'Edge Function `rappels`, pas ici :
 * ce fichier est mis en cache par le navigateur pour un temps qu'on ne
 * maîtrise pas, il ne doit donc porter aucune règle métier.
 */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // Un message illisible ne doit pas faire tomber le gestionnaire : sans
    // notification affichée, le navigateur peut révoquer l'abonnement.
    data = {}
  }

  const titre = data.titre || 'Tenload'
  const options = {
    body: data.corps || 'Le carnet t’attend.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    lang: 'fr',
    // Un tag par rappel : celui de 8 h remplace le précédent au lieu
    // d'empiler trois matins non lus sur l'écran de verrouillage.
    tag: data.tag || 'tenload',
    renotify: true,
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(titre, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const cible = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      // Rouvrir une fenêtre déjà ouverte plutôt qu'en empiler une deuxième :
      // sur iPhone, deux instances de la PWA se disputent le même cache.
      for (const f of fenetres) {
        if ('focus' in f) return f.focus()
      }
      return self.clients.openWindow(cible)
    }),
  )
})

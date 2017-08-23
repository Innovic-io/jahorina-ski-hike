const router = require('express').Router()

const config = require('../../config/app.config')
const queryBuilder = require('../../services/query-builder.service')
const googleService = require('../../services/google.service')
const cacheService = require('../../services/cache.service')
const indexHelperService = require('../../services/index-helper.service')

router.get('/', (req, res) => {
  const index = Math.floor((Math.random() * config.numOfBackgrounds) + 1)

  return indexHelperService.render('partials/search', {
    backgroundImage: 'background-' + index + '.jpg'
  }, res)
})

router.get('/terms_of_service', (req, res) => {
  return res.render('partials/terms-of-service', {});
})

router.get('/search', (req, res) => {
  cacheService.fileExists(req.query.type)
    .then((data) => {
      return cacheService.getFileContent(req.query.type)
    })
    .then((data) => {
      return indexHelperService.render('index', {
        placesData: data
      }, res)
    })
    .catch((error) => {
      const path = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?`
      const url = queryBuilder.create(path, req.query, config.key)

      googleService.getPlaces(url)
        .then((data) => {
          cacheService.createFile(req.query.type, data.results)

          return indexHelperService.render('index', {
            placesData: data.results
          }, res)
        })
        .catch((error) => {
          return res.status(400).json(error)
        })
    })
})

router.get('/place', (req, res) => {
  function getPlacePhotoAndMapUrl (apiKey, queries) {
    return {
      photoUrl: googleService.getPlacePhoto(apiKey, queries),
      placeMapUrl: googleService.getPlaceMapById(apiKey, queries.place_id)
    }
  }

  if (cacheService.check(req.query)) {
    let tempQuery = cacheService.get(req.query)
    const placePhotoAndMapUrl = getPlacePhotoAndMapUrl(config.key, tempQuery)

    return res.render('index', {
      title: tempQuery.name,
      city: config.city,
      placeDetails: tempQuery,
      placePhoto: placePhotoAndMapUrl.photoUrl,
      placeMap: placePhotoAndMapUrl.placeMapUrl
    })
  }

  const path = 'https://maps.googleapis.com/maps/api/place/details/json?'

  const url = queryBuilder.create(path, req.query, config.key)

  googleService.getPlaces(url)
    .then((data) => {
      const placePhotoAndMapUrl = getPlacePhotoAndMapUrl(config.key, data.result)

      cacheService.set(req.query, data.result)

      return res.render('index', {
        title: data.result.name,
        city: config.city,
        placeDetails: data.result,
        placePhoto: placePhotoAndMapUrl.photoUrl,
        placeMap: placePhotoAndMapUrl.placeMapUrl
      })
    })
    .catch((error) => {
      return res.status(400).json(error)
    })
})

module.exports = router

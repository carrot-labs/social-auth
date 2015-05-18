(function(angular, undefined) {
  'use strict';

  angular
    .module('instagram')
    .factory('API', API);

  function API($http) {
    return {
      getFeed: getFeed,
      getMediaById: getMediaById,
      likeMedia: likeMedia
    }

    function getFeed() {
      return $http.get('/api/feed');
    }

    function getMediaById(id) {
      return $http.get('/api/media/' + id);
    }

    function likeMedia(id) {
      return $http.post('/api/like', { mediaId: id });
    }
  }

})(angular);

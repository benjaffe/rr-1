var rr = rr || {};

(function(app) {
  var vm = app.vm || {};
  app.vm = vm;

  app.page = app.page || {};

  app.page.init = function(page) {
    if (page.hasInit()) {
      return false;
    }

    // === Read Action === //

    page.hasNavigated = ko.observable(false);
    page.hasReflected = ko.observable(false);

    page.showingArticle = ko.observable(true);
    page.showingForum = ko.observable(false);

    page.openArticle = function(page) {
      window.open(page.navigateTo(), '_blank');
    };

    page.markArticleAsRead = function() {
      page.hasNavigated(true);
      page.showForum();
    };

    page.showArticle = function() {
      if (page.type() === 'item') {
        page.showingArticle(true);
        page.showingForum(false);
      }
    };

    page.showForum = function() {
      if (page.type() === 'item') {
        page.showingArticle(false);
        page.showingForum(true);
      }
    };

    page.gotoParent = function() {
      if (page.type() === 'item' && page.parent.url()) {
        app.router.navigateToPage(page.parent.url());
      }
    };

    // === Forum Action === //

    if (page.forumReflect) {
      addForumStuff(page);
    }

    // Our page has now initialized
    page.hasInit(true);
  };

  function addForumStuff(page) {
    page.forumUrl = ko.observable();
    page.forumDataRaw = ko.observable();

    page.forumData = ko.computed(function() {
      if (!page.forumDataRaw()) {
        return {
          post_stream: {
            posts: []
          }
        };
      }
      return page.forumDataRaw();
    });

    page.replyingToPost = ko.observable(null);
    page.repliedToPost = ko.observable(null);
    page.replyContent = ko.observable('Hey, this is a sample reply. ' +
      'Looks good, I hope...');

    page.replyToPost = function(post) {
      page.replyingToPost(post);
      console.log(post);
      console.log(post.topic_id);
    };

    page.cancelReplyToPost = function() {
      page.replyingToPost(null);
    };

    page.sendReplyToPost = function(post) {
      var postId = post.topic_id;

      $.ajax('https://discussions.udacity.com/posts.json', {
        type: 'POST',
        xhrFields: {
          withCredentials: true
        },
        crossDomain: true,
        data: {
          'authenticity_token': app.csrf,
          'raw': page.replyContent(),
          'topic_id': postId,
          'is_warning': false,
          'nested_post': true
        }
      }).success(function(msg) {
        console.debug('Reply was successfully posted!', arguments);
        console.log(arguments);
        page.repliedToPost(post.id);
        page.replyingToPost(null);
        page.loadForumData({
          topicUrl: page.forumUrl()
        });
        currentPage().hasReflected(true);
      }).error(function(msg) {
        // TODO: Handle reply failure visually
        console.debug('Reply could not be posted.', arguments);
        console.log(arguments);
      });
    };

    page.loadForumData = function(options) {
      var self = this;
      $.ajax({
        url: options.topicUrl + '.json',
        xhrFields: {
          withCredentials: true
        }
      }).success(function(data) {
        console.debug(data);
        page.forumDataRaw(data); // TODO: abstract this out

        // get csrf so we can post
        $.ajax({
          url: discussionForumUrl + '/session/csrf.json',
          xhrFields: {
            withCredentials: true
          }
        }).success(function(data) {
          app.csrf = data.csrf;
          console.log('csrf acquired: ' + app.csrf);
          localStorage.csrf = app.csrf;
        });

      }).error(function(res) {
        if (res.readyState === 4) {
          console.debug('Page was not found: ' + options.topicUrl);
          if (!options.retry) {
            self.createTopic(options);
            return;
          }
        } else if (res.readyState === 0) {
          console.debug('Access denied: ' + options.topicUrl);
          page.forumDataRaw(null);
        } else {
          console.debug('An error occurred, readyState = ' + res.readyState + '. The discussion url is ' + options.topicUrl);
          page.forumDataRaw(null);
        }
        console.debug('Response', res);
      });
    };

    page.goBack = function() {
      currentPage().parent.key
    };

    if (localStorage.csrf) {
      app.csrf = localStorage.csrf;
    }
    var discussionForumUrl = 'https://discussions.udacity.com';
    console.log(page);
    this.forumKey = app.router.currentRoute().replace('/', '-');
    var topicUrl = discussionForumUrl + '/t/' + this.forumKey;
    var authUrl = 'https://www.udacity.com/account/sso/discourse';
    page.forumUrl(topicUrl);

    console.debug(self);
    console.debug(topicUrl);

    page.loadForumData({
      topicUrl: topicUrl
    });

    page.createTopic = function(options) {
      var self = this;

      console.debug('attempting to create the topic');

      options.retry = true;

      $.ajax('https://discussions.udacity.com/posts.json', {
        type: 'POST',
        xhrFields: {
          withCredentials: true
        },
        crossDomain: true,
        data: {
          'authenticity_token': app.csrf,
          'title': self.forumKey,
          'raw': 'Add your thoughts about this article!',
          'category': 758,
          is_warning:false,
          archetype:'regular',
          nested_post:true
        }
      }).success(function(msg) {
        console.debug('Topic was successfully created!', arguments);
        page.loadForumData(options);
      }).error(function(msg) {
        console.debug('Topic could not be created.', arguments);
        page.loadForumData(options);
      });
    };

    // app.vm.currentPage().pageState.set({linkVisited: true});
  }

})(rr);
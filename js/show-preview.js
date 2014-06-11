jQuery(document).ready(function() {
  var $ = jQuery;

  function getEditorContent() {
    if ($('#wp-content-wrap').hasClass('tmce-active')) {
      return tinyMCE.activeEditor.getContent();
    } else {
      return $('#wp-content-wrap .wp-editor-area').val();
    }
  }

  function KnotchWidgetEditor() {
    this.root = $('#knotch-add-widget');
    this.customTopicInput = $('.knotch-topic-name-other');
    this.disableButton = $('.knotch-disable-widget');

    this.lastSelected = $('.knotch-topic-id-radio:checked');

    // Initialize listeners
    this.customTopicInput.focus(function(event) {
      $('.knotch-other-radio').prop('checked', true);
    });
    this.customTopicInput.blur(this.onCustomTopicBlur.bind(this));

    this.customTopicInput.on('keypress', function(event) {
      if (event.keyCode == 13) {  // RETURN
        event.preventDefault();
        event.stopPropagation();
        this.onCustomTopicBlur();
      }
    }.bind(this));

    $('.knotch-suggest-topics').click(function() {
      var spinner = this.root.find('.spinner')
      spinner.css('display', 'inline-block');
      $.post(ajaxurl, {
        action: 'knotch_suggest_topic',
        data: {
          title: $('#title').val(),
          textHtml: getEditorContent()
        }
      }, function(response) {
        spinner.hide();
        this.renderSuggestions(JSON.parse(response));
      }.bind(this));
    }.bind(this));

    $('.knotch-topic-suggestions').on('click', '.knotch-topic-id-radio', function(event) {
      var radiobox = $(event.currentTarget);
      this.lastSelected = radiobox;
      this.updateTopicName(radiobox.parent().text());
    }.bind(this));

    $('.knotch-other-radio').click(function() {
      this.customTopicInput.focus();
      var customTopic = this.customTopicInput.val().trim();
      customTopic && this.updateTopicName(customTopic);
    }.bind(this));

    this.disableButton.change(function() {
      this.setDisabled(this.disableButton[0].checked);
    }.bind(this));
  }

  $.extend(KnotchWidgetEditor.prototype, {
    setDisabled: function(disabled) {
      this.disableButton[0].checked = disabled;

      var inputs = $('.knotch-topic-id-radio');
      var previewBox = $('.knotch-widget-preview');
      if (disabled) {
        inputs.attr('disabled', '1');
        this.customTopicInput.attr('disabled', '1');
        previewBox.hide();
      } else {
        inputs.removeAttr('disabled');
        this.customTopicInput.removeAttr('disabled');
        previewBox.show();
      }
    },

    updateTopicName: function(topicName) {
      // Used for form submission
      $('.knotch-topic-name').val(topicName);

      // Show a preview widget
      var param = $.param({
        canonicalURL: 'https://www.knotch.it/insight/dashboard/generator',
        topicName: topicName
      });

      var src = 'https://www.knotch.it/extern/quickKnotchBox?' + param;
      var iframe = '<iframe frameborder="0" src="' + src + '" style="width: 98% height: 140px">';

      $('.knotch-widget-preview').empty().append(iframe);
    },

    onCustomTopicBlur: function(event) {
      var topicName = this.customTopicInput.val().trim();
      if (topicName) {
        this.updateTopicName(topicName);
      } else if (this.lastSelected) {
        this.lastSelected.prop('checked', true);
        this.updateTopicName(this.lastSelected.parent().text());
      }
    },

    renderSuggestions: function(suggestions) {
      var root = $('.knotch-topic-suggestions');

      var html = '';
      for (var ii = 0; ii < suggestions.length && ii < 5; ii++) {
        var suggestion = suggestions[ii];
        var htmlId = 'knotch-suggested-topic-' + suggestion.id;

        var suggestion = suggestions[ii];
        var checked = '';
        if (ii == 0) {
          checked = '" checked="1';
        }

        html += '<div class="knotch-suggested-topic">' +
          '<input type="radio" name="knotch_topic_id" class="knotch-topic-id-radio" value="' +
          suggestion.id + checked + '" id="' + htmlId + '" /><label for="' +
          htmlId + '">' + suggestion.name + '</label></div>';
      }

      root.empty();
      root.append(html);

      this.setDisabled(false);
      this.lastSelected = $('.knotch-topic-id-radio:checked');
      this.updateTopicName(this.lastSelected.parent().text());
    }
  });

  new KnotchWidgetEditor();
});

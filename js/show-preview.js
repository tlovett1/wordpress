jQuery(document).ready(function() {
  var $ = jQuery;
  $('.knotch-suggest-topics').click(function() {
    $.post(ajaxurl, {
      action: 'knotch_suggest_topic',
      data: {
        title: $('#title').val(),
        textHtml: getEditorContent()
      }
    }, function(response) {
      handleNewSuggestions(JSON.parse(response));
    });
  });

  function getEditorContent() {
    if ($('#wp-content-wrap').hasClass('tmce-active')) {
      return tinyMCE.activeEditor.getContent();
    } else {
      return $('#wp-content-wrap .wp-editor-area').val();
    }
  }

  function handleNewSuggestions(suggestions) {
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
        '<input type="radio" name="knotch_topic_id" value="' +
        suggestion.id + checked + '" id="' + htmlId + '" /><label for="' +
        htmlId + '">' + suggestion.name + '</label></div>';
    }

    root.empty();
    root.append(html);
    $('.knotch-disable-widget')[0].checked = false;

    if (suggestions.length > 0) {
      $('.knotch-topic-name').val(suggestions[0].name);
    }
  }

  $('.knotch-disable-widget').change(function(event) {
    var inputs = $('.knotch-topic-suggestions input');
    if (isWidgetDisabled()) {
      inputs.attr('disabled', '1');
    } else {
      inputs.removeAttr('disabled');
    }
  });

  $('.knotch-topic-suggestions').on('click', '.knotch-suggested-topic input', function(event) {
    var topicName = $(event.currentTarget).parent().text();
    $('.knotch-topic-name').val(topicName);
    showPreview(topicName);
  });

  function isWidgetDisabled() {
    return $('.knotch-disable-widget')[0].checked;
  }

  function showPreview(topicName) {
    var param = $.param({
      canonicalURL: 'https://www.knotch.it/insight/dashboard/generator',
      topicName: topicName
    });

    var src = 'https://www.knotch.it/extern/quickKnotchBox?' + param;
    var iframe = '<iframe frameborder="0" src="' + src + '" style="width: 98% height: 140px">';

    $('.knotch-widget-preview').empty().append(iframe);
  }
});

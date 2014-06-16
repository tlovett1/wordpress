jQuery( document ).ready(function() {
	var $ = jQuery;

	var SCORE_CUTOFF = 0.15;
	var REFRESH_TIME_MS = 30000;
	var TAG_LISTEN_MS = 1000;

	function getEditorContent() {
		if ( $( '#wp-content-wrap' ).hasClass( 'tmce-active' ) ) {
			return tinyMCE.activeEditor ? tinyMCE.activeEditor.getContent() : null;
		} else {
			return $( '#wp-content-wrap .wp-editor-area' ).val();
		}
	}

	function KnotchWidgetEditor() {
		this.root = $( '#knotch-add-widget' );
		this.customTopicInput = $( '.knotch-topic-name-other' );
		this.disableButton = $( '.knotch-disable-widget' );

		this.lastSelected = $( '.knotch-topic-suggestions .knotch-topic-id-radio:checked' );
		this.lastSelected = this.lastSelected.length ? this.lastSelected : null;
		this.lastContent = null;

		// Initialize listeners
		this.customTopicInput.focus(function( event ) {
			$( '.knotch-other-radio' ).prop( 'checked', true );
		});
		this.customTopicInput.blur( this.onCustomTopicBlur.bind( this ) );

		this.customTopicInput.on( 'keypress', function( event ) {
			if ( event.keyCode === 13 ) {	// RETURN
				event.preventDefault();
				event.stopPropagation();
				this.onCustomTopicBlur();
			}
		}.bind( this ) );

		$( '.knotch-suggest-topics' ).click( this.fetchSuggestions.bind( this, true ) );

		$( '.knotch-topic-suggestions' ).on( 'click', '.knotch-topic-id-radio', function( event ) {
			var radiobox = $( event.currentTarget );
			this.lastSelected = radiobox;
			this.updateTopicName( radiobox.parent().text() );
			this.timer && clearTimeout( this.timer );
			this.tagTimer && clearTimeout( this.tagTimer );
		}.bind( this ) );

		$( '.knotch-other-radio' ).click(function() {
			this.customTopicInput.focus();
			var customTopic = this.customTopicInput.val().trim();
			customTopic && this.updateTopicName( customTopic );
		}.bind( this ) );

		this.disableButton.change(function() {
			this.setDisabled( this.disableButton[0].checked );
			this.timer && clearTimeout( this.timer );
			this.tagTimer && clearTimeout( this.tagTimer );
		}.bind( this ) );

		$( '.knotch-widget-prompt' ).change(function( event ) {
			this.updateTopicName( this.lastSelected.parent().text() );
		}.bind( this ) );

		// If our menu is shown AND the user has not selected anything in the past
		if ( $( '.knotch-topic-suggestions' ).is( ':visible' ) &&
			 ! $( '.knotch-topic-id-radio:checked' ).length &&
			 ! this.disableButton[0].checked ) {
			this.startContentListener();
		}
	}

	$.extend( KnotchWidgetEditor.prototype, {
		startContentListener: function() {
			this.lastContent = getEditorContent();

			var timerFunction = function() {
				var content = getEditorContent();
				if ( content != this.lastContent ) {
					this.fetchSuggestions( false );
				}

				this.timer = setTimeout( timerFunction, REFRESH_TIME_MS );
			}.bind( this );

			// Also listen to tag changes -- update immediately if it happens
			var tagsElem = $( '.the-tags' );
			this.lastTags = tagsElem.val();

			var tagTimerFunction = function() {
				if ( this.lastTags != tagsElem.val() ) {
					this.lastTags = tagsElem.val();
					this.fetchSuggestions( false );
				}
				this.tagTimer = setTimeout( tagTimerFunction, TAG_LISTEN_MS );
			}.bind( this );

			timerFunction();
			tagTimerFunction();
		},

		fetchSuggestions: function( forced ) {
			this.lastContent = getEditorContent();

			var spinner = this.root.find( '.spinner' );
			spinner.css( 'display', 'inline-block' );
			$.post( ajaxurl, {
				action: 'knotch_suggest_topic',
				data: {
					title: $( '#title' ).val(),
					textHtml: this.lastContent,
					tags: $( '.the-tags' ).val()
				}
			}, function( response ) {
				var suggestions = JSON.parse ( response );

				suggestions = suggestions.slice( 0, 5 ).filter(function( suggestion ) {
					return suggestion.score > SCORE_CUTOFF;
				});

				spinner.hide();
				this.renderSuggestions( suggestions );

				if ( ! suggestions.length && forced ) {
						$('.knotch-no-suggestions').show();
				} else {
						$('.knotch-no-suggestions').hide();
				}
			}.bind( this ) );
		},

		setDisabled: function( disabled ) {
			this.disableButton[0].checked = disabled;

			var inputs = $( '.knotch-topic-id-radio' );
			var previewBox = $( '.knotch-widget-preview' );
			if ( disabled ) {
				inputs.attr( 'disabled', '1' );
				this.customTopicInput.attr( 'disabled', '1' );
				previewBox.hide();
			} else {
				inputs.removeAttr( 'disabled' );
				this.customTopicInput.removeAttr( 'disabled' );
				previewBox.show();
			}
		},

		updateTopicName: function( topicName ) {
			// Used for form submission
			$( '.knotch-topic-name' ).val( topicName );

			$( '.knotch-widget-preview' ).empty();

			if ( ! topicName ) {
					return;
			}

			// Show a preview widget
			var param = {
				canonicalURL: 'https://www.knotch.it/insight/dashboard/generator',
				topicName: topicName,
				preview: true
			};

			if ( $( '.knotch-widget-prompt' ).val() === 'interest' ) {
				param.positiveLabel = 'interested';
				param.negativeLabel = 'uninterested';
				param.hoverPrompt = 'You are %s in %t';
				param.prompt = 'Are you interested in %t?';
			}

			var src = 'https://www.knotch.it/extern/quickKnotchBox?' + $.param( param );
			var iframe = '<iframe frameborder="0" src="' + src + '" style="width: 98% height: 140px">';

			$( '.knotch-widget-preview' ).append( iframe );
		},

		onCustomTopicBlur: function( event ) {
			var topicName = this.customTopicInput.val().trim();
			if ( topicName ) {
				this.setDisabled( false );
				this.updateTopicName( topicName );
				this.timer && clearTimeout( this.timer );
				this.tagTimer && clearTimeout( this.tagTimer );
			} else if ( this.lastSelected ) {
				this.lastSelected.prop( 'checked', true );
				this.updateTopicName( this.lastSelected.parent().text() );
			}
		},

		renderSuggestions: function( suggestions ) {
			var root = $( '.knotch-topic-suggestions' );

			var html = '';
			for ( var ii = 0; ii < suggestions.length; ii++ ) {
				var suggestion = suggestions[ii];

				var htmlId = 'knotch-suggested-topic-' + suggestion.id;

				var checked = '';
				if ( ii === 0 ) {
					checked = '" checked="1';
				}

				html += '<div class="knotch-suggested-topic">' +
					'<input type="radio" name="knotch_topic_id" class="knotch-topic-id-radio" value="' +
					suggestion.id + checked + '" id="' + htmlId + '" /><label for="' +
					htmlId + '">' + suggestion.name + '</label></div>';
			}

			root.empty();
			root.append( html );

			this.setDisabled( false );
			this.lastSelected = $( '.knotch-topic-id-radio:checked' );
			this.updateTopicName( this.lastSelected.parent().text() );
		}
	});

	new KnotchWidgetEditor();
});

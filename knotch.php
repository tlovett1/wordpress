<?php
  /**
   * Plugin Name: Knotch
   * Description: Adds the ability to include Knotch widgets. Official Knotch plugin.
   * Version: 0.3.0
   * Author: Knotch
   * Author URI: https://www.knotch.it
   * License: GPL2
   */

class Knotch {
  const OPTIONS_GROUP = 'knotch_api_options_group';
  const OPTIONS_PAGE = 'knotch_options';
  const API_OPTIONS_NAME = 'knotch_api_options';

  public static function loadPreviewScript($hook) {
    if ('post.php' != $hook) {
      return;
    }

    wp_enqueue_script(
      'knotch_preview_js',
      plugins_url('/js/show-preview.js', __FILE__)
    );

    wp_enqueue_style(
      'knotch_preview_css',
      plugins_url('/css/show-preview.css', __FILE__)
    );
  }

  public static function addBoxes($post) {
    add_meta_box(
      'knotch-add-widget',
      __('Knotch Widget'),
      array('Knotch', 'renderWidgetMetaBox'),
      'post',
      'normal',
      'default'
    );
  }

  public static function renderWidgetMetaBox($post) {
    $postId = $post->ID;
    $disabled = get_post_meta($postId, '_knotch_disable_widget', true);
    $topicName = get_post_meta($postId, '_knotch_topic_name', true);

    $disabledHtml = '';
    if ($disabled) {
      $disabledHtml = ' checked="1"';
    }

    echo '<a class="knotch-suggest-topics button">Suggest Topics</a>';
    echo '<div class="knotch-widget-preview"></div>';
    echo '<div class="knotch-topic-suggestions"></div>';
    echo '<div class="knotch-disable-widget-container"><input type="checkbox" class="knotch-disable-widget" name="knotch_disable_widget" id="knotch-disable-widget" ' . $disabledHtml . ' /><label for="knotch-disable-widget">Don&lsquo;t render a widget</label></div>';
    echo '<input type="hidden" class="knotch-topic-name" name="knotch_topic_name" value="' . esc_attr($topicName) . '" />';
  }

  public static function addOptionsMenu() {
    add_options_page(
      'Settings Admin',
      'Knotch',
      'manage_options',
      self::OPTIONS_PAGE,
      array('Knotch', 'renderOptionsPage')
    );
  }

  public static function registerSettings() {
    $sectionId = 'kn_api_setting_section';

    register_setting(self::OPTIONS_GROUP, self::API_OPTIONS_NAME);

    add_settings_section(
      $sectionId,
      'API settings',
      array('Knotch', 'renderApiSettings'),
      self::OPTIONS_PAGE
    );

    add_settings_field(
      'clientId',
      'Client ID',
      array('Knotch', 'renderClientId'),
      self::OPTIONS_PAGE,
      $sectionId
    );

    add_settings_field(
      'secret',
      'API Secret',
      array('Knotch', 'renderApiSecret'),
      self::OPTIONS_PAGE,
      $sectionId
    );
  }

  public static function renderOptionsPage() {
    echo '<div class="wrap">';
    echo '<h2>Knotch Options</h2>';
    echo '<form method="post" action="options.php">';
    settings_fields(self::OPTIONS_GROUP);
    do_settings_sections(self::OPTIONS_PAGE);
    submit_button();
    echo '</form></div>';
  }

  public static function renderApiSettings() {
    echo '<p>Enter your client ID and your API secret here. Note that you should keep your API secret secure and never share it with anyone.</p>';
    echo '<p>Need help? Contact <a href="mailto:insight@knotch.it">insight@knotch.it</a></p>';
  }

  public static function renderClientId() {
    printf(
      '<input type="text" id="clientId" name="%s" value="%s" class="regular-text" />',
      self::API_OPTIONS_NAME . '[clientId]',
      get_option(self::API_OPTIONS_NAME)['clientId']
    );
  }

  public static function renderApiSecret() {
    printf(
      '<input type="text" id="secret" name="%s" value="%s" class="regular-text" />',
      self::API_OPTIONS_NAME . '[secret]',
      get_option(self::API_OPTIONS_NAME)['secret']
    );
  }

  public static function suggestTopicHandler() {
    $data = stripslashes_deep($_POST['data']);

    $title = $data['title'];
    $text = strip_tags($data['textHtml']);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML401);

    $endpoint = 'https://www.knotch.it/insight/suggestTopics';

    $options = get_option(self::API_OPTIONS_NAME);

    $result = wp_remote_post($endpoint, array(
      'timeout' => 45,
      'body' => array(
        'title' => $title,
        'text' => $text,
        'clientId' => $options['clientId'],
        'secret' => $options['secret'],
        'v' => 'wp-0.3.0'
      )
    ));

    echo $result['body'];
    die();
  }

  public static function savePostHandler($postId) {
    if ($_POST['post_type'] != 'post') {
      return;
    }

    if (isset($_REQUEST['knotch_disable_widget']) &&
        $_REQUEST['knotch_disable_widget']) {
      delete_post_meta($postId, '_knotch_topic_id');
      delete_post_meta($postId, '_knotch_topic_name');
      update_post_meta($postId, '_knotch_disable_widget', '1');
      return;
    } else {
      delete_post_meta($postId, '_knotch_disable_widget');
    }


    if (isset($_REQUEST['knotch_topic_id']) &&
        isset($_REQUEST['knotch_topic_name']) && $_REQUEST['knotch_topic_name']) {
      update_post_meta($postId, '_knotch_topic_id', $_REQUEST['knotch_topic_id']);
      update_post_meta($postId, '_knotch_topic_name', $_REQUEST['knotch_topic_name']);
    }
  }

  public static function addKnotchWidget($content) {
    $post = $GLOBALS['post'];
    if ($post->post_type != 'post') {
      return;
    }

    $topicId = get_post_meta($post->ID, '_knotch_topic_id', true);
    $topicName = get_post_meta($post->ID, '_knotch_topic_name', true);

    if ($topicId && $topicName) {
      $permalink = get_permalink($post->ID);

      $options = get_option(self::API_OPTIONS_NAME);

      $query = http_build_query(array(
        'cid' => $options['clientId'],
        'canonicalURL' => $permalink,
        'topicName' => $topicName,
        'topicID' => $topicId,
      ));

      $iframeSrc = 'https://www.knotch.it/extern/quickKnotchBox?' . $query;

      return $content . '<iframe class="knotch-post-widget" frameborder="0" src="' .
        $iframeSrc . '" style="width: 98%; height: 250px"></iframe>';
    }

    return $content;
  }
}

if (is_admin()) {
  add_action('admin_menu', array('Knotch', 'addOptionsMenu'));
  add_action('admin_init', array('Knotch', 'registerSettings'));

  add_action('add_meta_boxes_post', array('Knotch', 'addBoxes'));

  add_action('wp_ajax_knotch_suggest_topic', array('Knotch', 'suggestTopicHandler'));
  add_action('admin_enqueue_scripts', array('Knotch', 'loadPreviewScript'));

  add_action('save_post', array('Knotch', 'savePostHandler'));
}

add_filter('the_content', array('Knotch', 'addKnotchWidget'));

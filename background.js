var DEBUG = false,
  i, aKey, aVal, ws,
  ws_addr = localStorage.getItem('ws_address') || 'husband.jit.su',
  scholar_count = 0,
  scholar_run = 0,
  scholar_queue = [],
  load_try = 10,
  new_tabId = null,
  alldigi = /^\d+$/,
  old_id = '',
  dd = document,
  init_found = localStorage.getItem('id_found') || '',
  apikey, req_key, rev_proxy, base, pubmeder_apikey, pubmeder_email,
  pubmeder_ok = 0,
  broadcast_loaded = 0,
  ajax_pii_link = 1,
  currentTime = new Date(),
  year = currentTime.getFullYear(),
  month = currentTime.getMonth() + 1,
  day = currentTime.getDate(),
  date_str = 'day_' + year + '_' + month + '_' + day,
  last_date = localStorage.getItem('last_date_str') || '';


function get_ws_address() {
  $.getJSON('http://cail.jit.su/', function (d) {
    $.post('http://www.thepaperlink.com/',
      {'pmid':'1', 'title':'WEBSOCKET_SERVER', 'ip':d['x-forwarded-for']},
      function (ws_d) {
        DEBUG && console.log('>> get_ws_address: ' + ws_d);
        localStorage.setItem('ws_address', ws_d);
        if (ws_d !== ws_addr) {
          ws_addr = ws_d;
          if (ws) {
            ws.close();
            broadcast_loaded = 0;
          }
          DEBUG && console.log('>> connect to the new ws server');
          load_broadcast();
        }
      }
    ).error(function () {
      DEBUG && console.log('>> get_ws_address, step 2 error');
    });
  }).error(function() {
    DEBUG && console.log('>> get_ws_address, step 1 error');
  });
}

function load_common_values() {
  apikey = localStorage.getItem('thepaperlink_apikey') || null;
  req_key = apikey;
  if (req_key === null) {
    req_key = 'G0oasfw0382Wd3oQ0l1LiWzE'; // temp apikey, may disabled in the future
    //chrome.tabs.create({ url: chrome.extension.getURL("options.html") });
  }
  rev_proxy = localStorage.getItem('rev_proxy');
  base = 'https://pubget-hrd.appspot.com';
  if (rev_proxy === 'yes') {
    base = 'http://0.pl4.me';
  }
  pubmeder_apikey = localStorage.getItem('pubmeder_apikey') || null;
  pubmeder_email = localStorage.getItem('pubmeder_email') || null;
  if (pubmeder_apikey !== null && pubmeder_email !== null) {
    pubmeder_ok = 1;
  } else {
    pubmeder_ok = 0;
  }
  if (localStorage.getItem('ajax_pii_link') === 'no') {
    ajax_pii_link = 0;
  }
}
load_common_values();

function openNewTab(winId, url) {
  if (winId) {
    chrome.tabs.create({windowId: winId, url: url, active: true}, function (tab) {
      new_tabId = tab.id;
    });
  } else {
    chrome.tabs.create({url: url, active: true}, function (tab) {
      new_tabId = tab.id;
    });
  }
  DEBUG && console.log('>> a new tab for you, #' + new_tabId);
}

function genericOnClick(info, tab) {
  DEBUG && console.log('info', JSON.stringify(info));
  DEBUG && console.log('tab', JSON.stringify(tab));
  openNewTab(tab.windowId, 'http://www.thepaperlink.com');
}

function selectOnClick(info, tab) {
  var url, new_tab = localStorage.getItem('new_tab');
  if ( alldigi.test(info.selectionText) ) {
    url = 'http://www.thepaperlink.com/_' + info.selectionText;
  } else {
    url = 'http://www.thepaperlink.com/?q=' + info.selectionText;
  }
  if (new_tabId && new_tab === 'no') {
    chrome.tabs.query({windowId: tab.windowID}, function (tabs) {
      for (i = 0; i < tabs.length; i += 1) {
        if (new_tabId === tabs[i].id) {
          chrome.tabs.update(new_tabId, {url: url, active: true});
          return;
        }
      }
      openNewTab(tab.windowId, url);
    });
  } else {
    openNewTab(tab.windowId, url);
  }
}

function callJsOnClick(info, tab) {
  chrome.tabs.sendRequest(tab.id, {js_key: req_key, js_base: base + '/'});
}

function menu_generator() {
  chrome.contextMenus.create({'title': 'Search the_Paper_Link for \'%s\'',
    'contexts':['selection'], 'onclick': selectOnClick});
  chrome.contextMenus.create({'title': 'Find ID on this page',
    'contexts':['page'], 'onclick': callJsOnClick});
  chrome.contextMenus.create({'title': 'Visit the_Paper_Link',
    'contexts':['page'], 'onclick': genericOnClick}); // , 'link', 'editable', 'image', 'video', 'audio'
  chrome.contextMenus.create({'type': 'separator',
    'contexts':['page']});
  chrome.contextMenus.create({'title': 'Options', 'contexts':['page'],
    'onclick': function () {
      chrome.tabs.create({url: chrome.extension.getURL('options.html'), active: true});
  } });
}
if (localStorage.getItem('contextMenu_shown') !== 'no') {
  menu_generator();
  localStorage.setItem('contextMenu_on', 1);
}

function save_visited_ID(new_id) {
  if (!new_id || new_id === '999999999') {
    return;
  }
  var id_found = localStorage.getItem('id_found') || '';
  if (id_found.indexOf(new_id) === -1) {
    localStorage.setItem('id_found', id_found + ' ' + new_id);
  }
  if (id_found && id_found.split(' ').length > 11) {
    saveIt_pubmeder( localStorage.getItem('id_found').replace(/\s+/g, ',') );
  }
}

function saveIt_pubmeder(pmid) {
  if (pubmeder_ok === 0) {
    DEBUG && console.log('>> no valid pubmeder credit');
    return;
  }
  var args = {'apikey' : pubmeder_apikey,
              'email' : pubmeder_email,
              'pmid' : pmid},
    url = 'https://pubmeder-hrd.appspot.com/input';
  if (rev_proxy === 'yes') {
    url = 'http://1.pl4.me/input';
  }
  $.getJSON(url, args, function (d) {
    if (d.respond > 1) {
      var pre_history = localStorage.getItem('id_history') || '';
      pre_history.replace( /^,+|,+$/g, '' );
      pre_history += ',' + pmid;
      localStorage.setItem('id_history', pre_history);
      localStorage.setItem('id_found', '');
    }
  }).error(function () {
    var date = new Date();
    localStorage.setItem('pubmed_' + pmid, date.getTime());
  });
}

function eSearch(search_term, tabId) {
  var url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?tool=thepaperlink_chrome&db=pubmed&term=' + search_term;
  $.get(url,
    function (xml) {
      var pmid = $(xml).find('Id');
      if (pmid.length === 1) {
        localStorage.setItem('tabId:' + tabId.toString(), pmid.text());
        save_visited_ID( pmid.text() );
      }
    },
    'xml'
  ).error(function () {
    DEBUG && console.log('>> eSearch failed, do nothing');
  });
}

function email_abstract(a, b) {
  var aKey = 'email_' + a + '_' + b;
  $.post(base + '/',
    {'apikey': a, 'pmid': b, 'action': 'email'},
    function (d) {
      DEBUG && console.log('>> post /, action email: ' + d);
      localStorage.removeItem(aKey);
    }
  ).error(function () {
    DEBUG && console.log('>> email failed, save for later');
    var date = new Date();
    localStorage.setItem(aKey, date.getTime());
  });
}

function sendBinary(aB, pmid, upload, no_email) {
  try {
    var xhr = new XMLHttpRequest(),
      boundary = 'AJAX------------------------AJAX',
      contentType = "multipart/form-data; boundary=" + boundary,
      postHead = '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="file"; filename="pmid_' + pmid + '.pdf"\r\n' +
        'Content-Type: application/octet-stream\r\n\r\n',
      postTail = '\r\n--' + boundary + '--',
      abView = new Uint8Array(aB),
      post_data = postHead;
    console.log('__ download the file size ' + abView.length + ', prepare uploading');
    if (abView.length < 1000) {
      return;
    }
    for (i = 0; i < abView.length; i += 1) {
      post_data += String.fromCharCode(abView[i] & 0xff);
    }
    post_data += postTail;
    if (typeof XMLHttpRequest.prototype.sendAsBinary === 'function') {
      DEBUG && console.log('>> sendAsBinary support is built-in');
    } else {
      DEBUG && console.log('>> define sendAsBinary');
      XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
        function byteValue(x) {
          return x.charCodeAt(0) & 0xff;
        }
        var ords = Array.prototype.map.call(datastr, byteValue);
        var ui8a = new Uint8Array(ords);
        this.send(ui8a.buffer);
      };
    }
    xhr.open('POST', upload, true);
    xhr.onload = function () {
      console.log('__ upload the file to the server with status: ' + xhr.status);
      if (xhr.responseText === null) {
        DEBUG && console.log('>> email_pdf failed, just email the abstract');
        if (!no_email) {
          email_abstract(apikey, pmid);
        }
      }
    };
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.sendAsBinary(post_data);
  } catch (err) {
    DEBUG && console.log(err);
  }
}

function getBinary(file, pmid, upload, no_email) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', file, true);
  xhr.responseType = 'arraybuffer'; // Synchronous requests cannot have XMLHttpRequest.responseType set
  xhr.onload = function () {
    var aB = xhr.response; // not xhr.responseText
    if (aB) {
      sendBinary(aB, pmid, upload, no_email);
    }
  };
  xhr.send(null);
}

function dropbox_it(pmid, pdf, apikey) {
  $.ajax({
    url: base + '/file/new',
    dataType: 'jsonp',
    data: {'apikey': apikey, 'no_email': 1},
    //async: false,
  }).success(function (upload_url) {
    getBinary(pdf, pmid, upload_url, 1);
  }).error(function () {
    DEBUG && console.log('>> dropbox_it failed: ' + pdf);
  });
}

function reLoadOp() {
  var urlOp = chrome.extension.getURL('options.html');
  chrome.tabs.query({url: urlOp}, function (tabs) {
    for (i = 0; i < tabs.length; i += 1) {
      chrome.tabs.update(tabs[i].id, {url: urlOp});
    }
  });
}

function getRequest(request, sender, callback) {
  var m_status = localStorage.getItem('mendeley_status'),
    f_status = localStorage.getItem('facebook_status'),
    d_status = localStorage.getItem('dropbox_status'),
    b_status = localStorage.getItem('douban_status'),
    cloud_op = '',
    ezproxy_prefix = localStorage.getItem('ezproxy_prefix') || '';
  if (m_status && m_status === 'success') {
    cloud_op += 'm';
  }
  if (f_status && f_status === 'success') {
    cloud_op += 'f';
  }
  if (d_status && d_status === 'success') {
    cloud_op += 'd';
  }
  if (b_status && b_status === 'success') {
    cloud_op += 'b';
  }
  if (request.loadExtraJs) {
    chrome.tabs.sendRequest(sender.tab.id, {js_base_uri:base});
  } else if (request.url) {
    $.getJSON(base + request.url + req_key, function (d) {
      if (d && (d.count || d.error)) { // good or bad, both got json return
        chrome.tabs.sendRequest(sender.tab.id,
          {r:d, tpl:apikey, pubmeder:pubmeder_ok, save_key:pubmeder_apikey, save_email:pubmeder_email,
            cloud_op:cloud_op, uri:base, p:ezproxy_prefix}
        );
      } else {
        chrome.tabs.sendRequest(sender.tab.id,
          {except:1, tpl:apikey});
      }
    }).error(function () {
      chrome.tabs.sendRequest(sender.tab.id,
        {except:1, tpl:apikey});
    });
  } else if (request.save_apikey) {
    if (request.save_email) {
      localStorage.setItem('pubmeder_apikey', request.save_apikey);
      localStorage.setItem('pubmeder_email', request.save_email);
      localStorage.setItem('b_apikey_gold', 1);
      pubmeder_apikey = request.save_apikey;
      pubmeder_email = request.save_email;
      pubmeder_ok = 1;
    } else {
      localStorage.setItem('thepaperlink_apikey', request.save_apikey);
      localStorage.setItem('a_apikey_gold', 1);
      apikey = request.save_apikey;
      req_key = apikey;
    }
    reLoadOp();
  } else if (request.service && request.content) {
    DEBUG && console.log(request.service, request.content);
    if (request.content.indexOf('error') < 0) {
      localStorage.setItem(request.service + '_status', 'success');
    } else {
      localStorage.setItem(request.service + '_status', 'error? try again please');
    }
    reLoadOp();
  } else if (request.sendID) {
    if (localStorage.getItem('co_pubmed') !== 'no') {
      chrome.pageAction.show(sender.tab.id);
    } else {
      DEBUG && console.log('>> do nothing to sendID #' + request.sendID);
    }
    localStorage.setItem('tabId:' + sender.tab.id.toString(), request.sendID);
    if ( alldigi.test(request.sendID) ) {
      save_visited_ID(request.sendID);
    } else {
      eSearch(request.sendID, sender.tab.id);
    }
  } else if (request.menu_display) {
    if (localStorage.getItem('contextMenu_shown') !== 'no') {
      menu_generator();
      // just generated context menu
    } else {
      DEBUG && console.log('>> no need to update context menu');
    }
  } else if (request.upload_url && request.pdf && request.pmid && apikey) {
    DEBUG && console.log(request.pdf);
    getBinary(request.pdf, request.pmid, request.upload_url, request.no_email);
  } else if (request.save_cloud_op) {
    DEBUG && console.log(request.save_cloud_op);
    if (request.save_cloud_op.indexOf('mendeley') > -1) {
      localStorage.setItem('mendeley_status', 'success');
    }
    if (request.save_cloud_op.indexOf('facebook') > -1) {
      localStorage.setItem('facebook_status', 'success');
    }
    if (request.save_cloud_op.indexOf('dropbox') > -1) {
      localStorage.setItem('dropbox_status', 'success');
    }
    if (request.save_cloud_op.indexOf('douban') > -1) {
      localStorage.setItem('douban_status', 'success');
    }
  } else if (request.t_cont) {
    DEBUG && console.log(request.t_cont);
    var holder = dd.getElementById('clippy_t');
    holder.style.display = 'block';
    holder.value = request.t_cont;
    holder.select();
    dd.execCommand('Copy');
    holder.style.display = 'none';
  } else if (request.load_common_values) {
    load_common_values();
  } else if (request.a_pmid && request.a_title) {
    var in_mem = localStorage.getItem('scholar_' + request.a_pmid);
    if (in_mem) {
      in_mem = in_mem.split(',', 3);
      chrome.tabs.sendRequest(sender.tab.id, {
        g_scholar: 1, pmid: in_mem[0], g_num: in_mem[1], g_link: in_mem[2]
      });
    } else {
      scholar_queue[3*scholar_count] = request.a_pmid;
      scholar_queue[3*scholar_count + 1] = request.a_title;
      scholar_queue[3*scholar_count + 2] = sender.tab.id;
      scholar_count += 1;
      queue_scholar_title();
    }
  } else if (request.reset_scholar_count) {
    DEBUG && console.log('>> on-request reset scholar_count _run _queue');
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
  } else if (request.load_broadcast) {
    broadcast_loaded = 0;
    if (ws) {
      ws.close();
    }
    load_broadcast();
  } else if (ajax_pii_link && request.pii_link && request.pii && request.pmid) {
    parse_url(request.pmid, 'http://linkinghub.elsevier.com/retrieve/pii/' + request.pii, sender.tab.id);
  } else {
    DEBUG && console.log(request);
  }
}
chrome.extension.onRequest.addListener(getRequest);

$.ajax({
  url: 'https://pubget-hrd.appspot.com/static/humans.txt',
  dataType: 'text',
  timeout: 4000
}).success(function() {
  DEBUG && console.log('>> directly access our secured server');
}).error(function() {
  DEBUG && console.log('>> error? force rev_proxy');
  localStorage.setItem('rev_proxy', 'yes');
  rev_proxy = 'yes';
  base = 'http://0.pl4.me';
});

if (last_date !== date_str) {
  localStorage.setItem('last_date_str', date_str);
  DEBUG && console.log('>> a new day! start with some housekeeping tasks');
  for (i = 0; i < localStorage.length; i += 1) {
    aKey = localStorage.key(i);
    if (aKey && aKey.substr(0,6) === 'tabId:') {
      aVal = localStorage.getItem(aKey);
      if ( alldigi.test(aVal) ) {
        if (aVal !== '999999999' && init_found.indexOf(aVal) === -1) {
          old_id += ' ' + aVal;
        }
        localStorage.removeItem(aKey);
      }
    } else if (aKey && aKey.substr(0,6) === 'email_') {
      aVal = aKey.split('_');
      email_abstract(aVal[1], aVal[2]);
    } else if (aKey && aKey.substr(0,7) === 'pubmed_') {
      aVal = aKey.split('_');
      localStorage.removeItem(aKey);
      saveIt_pubmeder(aVal[1]);
    } else if (aKey && (aKey.substr(0,8) === 'scholar_' || aKey.substr(0,7) === 'scopus_')) {
      localStorage.removeItem(aKey);
    }
  }
}

if (old_id) {
  localStorage.setItem('id_found', init_found + ' ' + old_id);
}

////

function queue_scholar_title() {
  setTimeout(do_scholar_title, 1250*scholar_run + 1);
}

function do_scholar_title() {
  var pmid = scholar_queue[3*scholar_run],
    t = scholar_queue[3*scholar_run + 1],
    tabId = scholar_queue[3*scholar_run + 2];
  scholar_run += 1;
  scholar_title(pmid, t, tabId);
  if (scholar_run === scholar_count) {
    DEBUG && console.log('>> self-reset scholar_count _run _queue');
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
  }
}

function parse_url(pmid, url, tabId) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('url', url);
  var in_mem = localStorage.getItem('url_' + pmid);
  if (in_mem) {
    in_mem = in_mem.split(',', 2);
    chrome.tabs.sendRequest(tabId, {el_id: '_pdf' + pmid, el_data: in_mem[1]});
    in_mem = localStorage.getItem('scopus_' + pmid);
    if (in_mem) {
      in_mem = in_mem.split(',', 2);
      chrome.tabs.sendRequest(tabId, {el_id: 'pl4_scopus' + pmid, el_data: in_mem[1]});
    }
    return;
  }
  chrome.tabs.sendRequest(tabId, {el_id: '_pdf' + pmid, el_data: 1});
  $.get(url,
    function (r) {
      var reg = /href="([^"]+)" target="newPdfWin"/,
        reg2 = /Cited by in Scopus \((\d+)\)/i,
        h = reg.exec(r),
        h2 = reg2.exec(r),
        args;
      if (h && h.length) {
        DEBUG && console.log(h);
        args = {'apikey': req_key, 'pmid': pmid, 'pii_link': h[1]};
        if (h2 && h2.length) {
          DEBUG && console.log(h2);
          args.scopus_n = h2[1];
          localStorage.setItem('scopus_' + pmid, pmid + ',' + h2[1]);
          chrome.tabs.sendRequest(tabId, {el_id: 'pl4_scopus' + pmid, el_data: h2[1]});
        }
        localStorage.setItem('url_' + pmid, pmid + ',' + h[1]);
        chrome.tabs.sendRequest(tabId, {el_id: '_pdf' + pmid, el_data: h[1]});
        $.post(base + '/', args,
          function (d) {
            DEBUG && console.log('>> post pii_link (empty is a success): ' + d);
          }
        );
        return;
      }
      chrome.tabs.sendRequest(tabId, {el_id: '_pdf' + pmid, el_data: '://'});
    },
    'html'
  ).error(function () {
    DEBUG && console.log('>> parse_url failed, do nothing');
  });
}

function scholar_title(pmid, t, tabId) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('title', t);
  var in_mem = localStorage.getItem('scholar_' + pmid);
  if (in_mem) {
    in_mem = in_mem.split(',', 3);
    chrome.tabs.sendRequest(tabId, {
      g_scholar: 1, pmid: pmid, g_num: in_mem[1], g_link: in_mem[2]
    });
    return;
  }
  var url = 'http://scholar.google.com/scholar?as_q=&as_occt=title&as_sdt=1.&as_epq=' +
    encodeURIComponent('"' + t + '"');
  chrome.tabs.sendRequest(tabId, {
    g_scholar: 1, pmid: pmid, g_num: 1, g_link: 1
  });
  $.get(url,
    function (r) {
      var reg = /<a[^<]+>Cited by \d+<\/a>/,
        h = reg.exec(r),
        g_num = [], g_link = [];
      if (h && h.length) {
        DEBUG && console.log(h);
        g_num = />Cited by (\d+)</.exec(h[0]);
        g_link = /href="([^"]+)"/.exec(h[0]);
        if (g_num.length === 2 && g_link.length === 2) {
          localStorage.setItem('scholar_' + pmid, pmid + ',' + g_num[1] + ',' + g_link[1]);
          chrome.tabs.sendRequest(tabId, {
            g_scholar: 1, pmid: pmid, g_num: g_num[1], g_link: g_link[1]
          });
          $.post(base + '/',
            {'apikey': req_key, 'pmid': pmid, 'g_num': g_num[1], 'g_link': g_link[1]},
            function (d) {
              DEBUG && console.log('>> post g_num and g_link (empty is a success): ' + d);
            }
          );
          return;
        }
      }
      chrome.tabs.sendRequest(tabId, {
        g_scholar: 1, pmid: pmid, g_num: 0, g_link: 0
      });
    },
    'html'
  ).error(function () {
    DEBUG && console.log('>> scholar_title failed');
    chrome.tabs.sendRequest(tabId, {
      g_scholar: 1, pmid: pmid, g_num: 0, g_link: 0
    });
  });
}

function load_broadcast() {
  var _self = this;
  this.start = function () {
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    if (!window.WebSocket) {
      return;
    }
    ws = new WebSocket('ws://' + ws_addr);

    ws.onopen = function () {
      DEBUG && console.log('>> ws is established');
      broadcast_loaded = 1;
      ws.send('{"apikey":"' + req_key + '"}');
    };

    ws.onclose = function () {
      if (broadcast_loaded === 1) {
        console.log('__ server comminucation lost, reconnecting...');
        load_try -= 1;
        clearTimeout(_self.refresh);
        if (load_try < 0) {
          DEBUG && console.log('>> ws is broken');
          broadcast_loaded = 0;
          return;
        }
        setTimeout(_self.start, 3000);
      } else {
        DEBUG && console.log('>> ws is closed');
        return;
      }
    };
    //setInterval(function() {
    //  if (ws.readyState !== 1) {
    //    console.log('__ unable to comminucate with the WebSocket server');
    //  }
    //}, 3000);

    ws.onerror = function (err) {
      DEBUG && console.log('>> ws error: ' + err);
      return;
    };

    ws.onmessage = function (message) {
      try {
        var d = JSON.parse(message.data);
        DEBUG && console.log(d);
        if (d.apikey === req_key && d.action) {
          if (d.action === 'title') {
            chrome.tabs.query({active: true, currentWindow: true},
              function (tabs) {
                scholar_title(d.pmid, d.title, tabs[0].id);
              }
            );
          } else if (d.action === 'url') {
            chrome.tabs.query({active: true, currentWindow: true},
              function (tabs) {
                parse_url(d.pmid, d.url, tabs[0].id);
              }
            );
          } else if (d.action === 'pdfLink_quick') {
            chrome.tabs.query({active: true, currentWindow: true},
              function (tabs) {
                chrome.tabs.sendRequest(tabs[0].id, {el_id: 'pdfLink_quick', el_data: d.pdfLink_quick});
              }
            );
          } else if (d.action === 'dropbox_it') {
            dropbox_it(d.pmid, d.pdf, d.apikey);
          }
        }
      } catch (err) {
        DEBUG && console.log('>> json parse error: ' + message.data);
      }
    };
  }
  _self.start();
}

$(document).ready(function () {
  if (!broadcast_loaded && localStorage.getItem('ws_items') === 'yes') {
    load_broadcast();
    get_ws_address();
  }
});
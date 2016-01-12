/**
 * @license
 * Copyright 2016 Thomas Steiner (@tomayac). All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* globals UrlFetchApp, XmlService */
/* jshint -W004 */

/**
 * Returns Wikipedia synonyms (redirects) for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get synonyms for
 * @return {Array<string>} The list of synonyms
 */
function WIKISYNONYMS(article) {
  'use strict';
  if (!article) {
    return '';
  }
  var results = [];
  try {
    var language = article.split(':')[0];
    var title = article.split(':')[1];
    if (!title) {
      return '';
    }
    var url = 'https://' + language + '.wikipedia.org/w/api.php' +
        '?action=query' +
        '&blnamespace=0' +
        '&list=backlinks' +
        '&blfilterredir=redirects' +
        '&bllimit=max' +
        '&format=xml' +
        '&bltitle=' + title.replace(/\s/g, '_');
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var entries = document.getRootElement().getChild('query')
        .getChild('backlinks').getChildren('bl');
    for (var i = 0; i < entries.length; i++) {
      var text = entries[i].getAttribute('title').getValue();
      results[i] = text;
    }
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

/**
 * Returns Wikipedia translations (language links) for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get translations for
 * @param {Array<string>=} opt_targetLanguages The list of languages to limit the results to (optional)
 * @param {boolean=} opt_returnAsObject Whether to return the results as an object, defaults to false (optional)
 * @param {boolean=} opt_skipHeader Whether to skip the header, defaults to false (optional)
 * @return {Array<string>} The list of translations
 */
function WIKITRANSLATE(article, opt_targetLanguages, opt_returnAsObject,
    opt_skipHeader) {
  'use strict';
  if (!article) {
    return '';
  }
  var results = {};
  opt_targetLanguages = opt_targetLanguages || [];
  opt_targetLanguages = Array.isArray(opt_targetLanguages) ?
      opt_targetLanguages : [opt_targetLanguages];
  var temp = {};
  opt_targetLanguages.forEach(function(lang) {
    temp[lang] = true;
  });
  opt_targetLanguages = Object.keys(temp);
  try {
    var language = article.split(':')[0];
    var title = article.split(':')[1];
    if (!title) {
      return '';
    }
    opt_targetLanguages.forEach(function(targetLanguage) {
      if (targetLanguage) {
        results[targetLanguage] = title.replace(/_/g, ' ');
      }
    });
    var url = 'https://' + language + '.wikipedia.org/w/api.php' +
        '?action=query' +
        '&prop=langlinks' +
        '&format=xml' +
        '&lllimit=max' +
        '&titles=' + title.replace(/\s/g, '_');
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var entries = document.getRootElement().getChild('query').getChild('pages')
        .getChild('page').getChild('langlinks').getChildren('ll');
    var targetLanguagesSet = opt_targetLanguages.length > 0;
    for (var i = 0; i < entries.length; i++) {
      var text = entries[i].getText();
      var lang = entries[i].getAttribute('lang').getValue();
      if ((targetLanguagesSet) && (opt_targetLanguages.indexOf(lang) === -1)) {
        continue;
      }
      results[lang] = text;
    }
    title = title.replace(/_/g, ' ');
    results[language] = title;
  } catch (e) {
    // no-op
  }
  if (opt_returnAsObject) {
    return results;
  }
  var arrayResults = [];
  for (var lang in results) {
    if (opt_skipHeader) {
      arrayResults.push(results[lang]);
     } else {
       arrayResults.push([lang, results[lang]]);
     }
  }
  return arrayResults.length > 0 ? arrayResults : '';
}

/**
 * Returns Wikipedia translations (language links) and synonyms (redirects) for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get translations and synonyms for
 * @param {Array<string>=} opt_targetLanguages The list of languages to limit the results to (optional)
 * @param {boolean=} opt_returnAsObject Whether to return the results as an object, defaults to false (optional)
 * @return {Array<string>} The list of translations and synonyms
 */
function WIKIEXPAND(article, opt_targetLanguages, opt_returnAsObject) {
  'use strict';
  if (!article) {
    return '';
  }
  var results = opt_returnAsObject ? {} : [];
  try {
    var language = article.split(':')[0];
    var title = article.split(':')[1];
    if (!title) {
      return '';
    }
    opt_targetLanguages = opt_targetLanguages || [];
    opt_targetLanguages = Array.isArray(opt_targetLanguages) ?
        opt_targetLanguages : [opt_targetLanguages];
    var temp = {};
    opt_targetLanguages.forEach(function(lang) {
      temp[lang] = true;
    });
    opt_targetLanguages = Object.keys(temp);
    var translations = WIKITRANSLATE(article, opt_targetLanguages, true);
    var i = 0;
    for (var lang in translations) {
      var synonyms = WIKISYNONYMS(lang + ':' + translations[lang]);
      if (opt_returnAsObject) {
        results[lang] = [translations[lang]].concat(synonyms);
      } else {
        results[i] = [lang].concat(([translations[lang]].concat(synonyms)));
      }
      i++;
    }
  } catch (e) {
    // no-op
  }
  return opt_returnAsObject ? results : results;
}

/**
 * Returns Wikipedia category members for a Wikipedia category
 *
 * @param {string} category The Wikipedia category in the format "language:Category_Title" ("en:Category:Visitor_attractions_in_Berlin") to get members for
 * @return {Array<string>} The list of category members
 */
function WIKICATEGORYMEMBERS(category) {
  'use strict';
  if (!category) {
    return '';
  }
  var results = [];
  try {
    var language = category.split(':')[0];
    var title = category.split(':')[1] + ':' + category.split(':')[2];
    if (!title) {
      return '';
    }
    var url = 'https://' + language + '.wikipedia.org/w/api.php' +
        '?action=query' +
        '&list=categorymembers' +
        '&cmlimit=max' +
        '&cmprop=title' +
        '&cmtype=subcat%7Cpage' +
        '&format=xml' +
        '&cmnamespace=0' +
        '&cmtitle=' + encodeURIComponent(title.replace(/\s/g, '_'));
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var entries = document.getRootElement().getChild('query')
        .getChild('categorymembers').getChildren('cm');
    for (var i = 0; i < entries.length; i++) {
      var text = entries[i].getAttribute('title').getValue();
      results[i] = text;
    }
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

/**
 * Returns Wikipedia subcategories for a Wikipedia category
 *
 * @param {string} category The Wikipedia category in the format "language:Category_Title" ("en:Category:Visitor_attractions_in_Berlin") to get subcategories for
 * @return {Array<string>} The list of subcategories
 */
function WIKISUBCATEGORIES(category) {
  'use strict';
  if (!category) {
    return '';
  }
  var results = [];
  try {
    var language = category.split(':')[0];
    var title = category.split(':')[1] + ':' + category.split(':')[2];
    if (!title) {
      return '';
    }
    var url = 'https://' + language + '.wikipedia.org/w/api.php' +
        '?action=query' +
        '&list=categorymembers' +
        '&cmlimit=max' +
        '&cmprop=title' +
        '&cmtype=subcat%7Cpage' +
        '&format=xml' +
        '&cmnamespace=14' +
        '&cmtitle=' + encodeURIComponent(title.replace(/\s/g, '_'));
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var entries = document.getRootElement().getChild('query')
        .getChild('categorymembers').getChildren('cm');
    for (var i = 0; i < entries.length; i++) {
      var text = entries[i].getAttribute('title').getValue();
      results[i] = text;
    }
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

/**
 * Returns Wikipedia inbound links for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get inbound links for
 * @return {Array<string>} The list of inbound links
 */
function WIKIINBOUNDLINKS(article) {
  'use strict';
  if (!article) {
    return '';
  }
  var results = [];
  try {
    var language = article.split(':')[0];
    var title = article.split(':')[1];
    if (!title) {
      return '';
    }
    var url = 'https://' + language + '.wikipedia.org/w/api.php' +
        '?action=query' +
        '&list=backlinks' +
        '&bllimit=max' +
        '&blnamespace=0' +
        '&format=xml' +
        '&bltitle=' + title.replace(/\s/g, '_');
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var entries = document.getRootElement().getChild('query')
        .getChild('backlinks').getChildren('bl');
    for (var i = 0; i < entries.length; i++) {
      var text = entries[i].getAttribute('title').getValue();
      results[i] = text;
    }
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

/**
 * Returns Wikipedia outbound links for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get outbound links for
 * @return {Array<string>} The list of outbound links
 */
function WIKIOUTBOUNDLINKS(article) {
  'use strict';
  if (!article) {
    return '';
  }
  var results = [];
  try {
    var language = article.split(':')[0];
    var title = article.split(':')[1];
    if (!title) {
      return '';
    }
    var url = 'https://' + language + '.wikipedia.org/w/api.php' +
        '?action=query' +
        '&prop=links' +
        '&plnamespace=0' +
        '&format=xml' +
        '&pllimit=max' +
        '&titles=' + title.replace(/\s/g, '_');
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var entries = document.getRootElement().getChild('query').getChild('pages')
        .getChild('page').getChild('links').getChildren('pl');
    for (var i = 0; i < entries.length; i++) {
      var text = entries[i].getAttribute('title').getValue();
      results[i] = text;
    }
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

/**
 * Returns Wikipedia mutual links, i.e, the intersection of inbound and outbound links for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get mutual links for
 * @return {Array<string>} The list of mutual links
 */
function WIKIMUTUALLINKS(article) {
}

/**
 * Returns Wikipedia geocoordinates for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get geocoordinates for
 * @return {Array<number>} The latitude and longitude
 */
function WIKIGEOCOORDINATES(article) {
  'use strict';
  if (!article) {
    return '';
  }
  var results = [];
  try {
    var language = article.split(':')[0];
    var title = article.split(':')[1];
    if (!title) {
      return '';
    }
    var url = 'https://en.wikipedia.org/w/api.php' +
        '?action=query' +
        '&prop=coordinates' +
        '&format=xml' +
        '&colimit=max' +
        '&coprimary=primary' +
        '&titles=' + title.replace(/\s/g, '_');
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var coordinates = document.getRootElement().getChild('query')
        .getChild('pages').getChild('page').getChild('coordinates')
        .getChild('co');
    var latitude = coordinates.getAttribute('lat').getValue();
    var longitude = coordinates.getAttribute('lon').getValue();
    results = [[latitude, longitude]];
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

/**
 * Returns Wikidata facts for a Wikipedia article
 *
 * @param {string} article The Wikipedia article in the format "language:Article_Title" ("de:Berlin") to get Wikidata facts for
 * @return {Array<string>} The list of Wikidata facts
 */
function WIKIDATAFACTS(article) {
  'use strict';

  var simplifyClaims = function(claims) {
    var claim, id, simpleClaims;
    simpleClaims = {};
    for (id in claims) {
      claim = claims[id];
      simpleClaims[id] = simpifyClaim(claim);
    }
    return simpleClaims;
  };

  var simpifyClaim = function(claim) {
    var i, len, simpifiedStatement, simplifiedClaim, statement;
    simplifiedClaim = [];
    for (i = 0, len = claim.length; i < len; i++) {
      statement = claim[i];
      simpifiedStatement = simpifyStatement(statement);
      if (simpifiedStatement !== null) {
        simplifiedClaim.push(simpifiedStatement);
      }
    }
    return simplifiedClaim;
  };

  var simpifyStatement = function(statement) {
    var datatype, datavalue, mainsnak;
    mainsnak = statement.mainsnak;
    if (mainsnak === null) {
      return null;
    }
    datatype = mainsnak.datatype, datavalue = mainsnak.datavalue;
    if (datavalue === null) {
      return null;
    }
    switch (datatype) {
      case 'string':
      case 'commonsMedia':
      case 'url':
        return datavalue.value;
      case 'monolingualtext':
        return datavalue.value.text;
      case 'wikibase-item':
        return 'Q' + datavalue.value['numeric-id'];
      case 'time':
        return datavalue.value.time;
      case 'quantity':
        return datavalue.value.amount;
      default:
        return null;
    }
  };

  if (!article) {
    return '';
  }
  var results = [];
  try {
    var language = article.split(':')[0];
    var title = article.split(':')[1];
    if (!title) {
      return '';
    }
    var url = 'https://wikidata.org/w/api.php' +
        '?action=wbgetentities' +
        '&sites=' + language + 'wiki' +
        '&format=json' +
        '&props=claims' +
        '&titles=' + title.replace(/\s/g, '_');
    var json = JSON.parse(UrlFetchApp.fetch(url).getContentText());
    var entity = Object.keys(json.entities)[0];
    var simplifiedClaims = simplifyClaims(json.entities[entity].claims);
    for (var claim in simplifiedClaims) {
      var claims = simplifiedClaims[claim].filter(function(value) {
        return value !== null;
      });
      // Only return single-object facts
      if (claims.length === 1) {
        results.push([claim, claims[0]]);
      }
    }
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

/**
 * Returns Google Suggest results for the given keyword
 *
 * @param {string} keyword The keyword to get suggestions for
 * @param {string=} opt_language The language to get suggestions in, defaults to "en" (optional)
 * @return {Array<string>} The list of suggestions
 */
function GOOGLESUGGEST(keyword, opt_language) {
  'use strict';
  if (!keyword) {
    return '';
  }
  opt_language = opt_language || 'en';
  var results = [];
  try {
    var url = 'https://suggestqueries.google.com/complete/search' +
        '?output=toolbar' +
        '&hl=' + opt_language +
        '&q=' + encodeURIComponent(keyword);
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var entries = document.getRootElement().getChildren('CompleteSuggestion');
    for (var i = 0; i < entries.length; i++) {
      var text = entries[i].getChild('suggestion').getAttribute('data')
          .getValue();
      results[i] = text;
    }
  } catch (e) {
    // no-op
  }
  return results.length > 0 ? results : '';
}

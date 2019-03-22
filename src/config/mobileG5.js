/* eslint-disable */

// https://docs.google.com/spreadsheets/d/1xuYdCodmiFY-NmAXq_8WTcO_WMfsZVNNeiGCr-w2xAY/edit#gid=0

import Data from "../vendor/Data";
import { frum } from "../vendor/queryOps";

const platform = 'android-hw-g5-7-0-arm7-api-16';

const fennec64 =
  {
    "header": ["geomean", "loadtime", "loadtime stdev", "fcp", "fnbpaint", "ttfi", "ttfi stdev", "dcf", "suite", "url"],


    "data": [
      [  679.54,  861.50,   66.82,    null,  763.00,  608.00,  175.62,  533.50, 'raptor-tp6m-amazon-geckoview',            "https://www.amazon.com"],
      [ 1312.60, 2173.50,  163.94,    null, 1082.00, 1198.00,  617.26, 1053.00, 'raptor-tp6m-facebook-geckoview',          "https://m.facebook.com"],
      [  260.17,  358.50,   77.86,    null,  385.00,  308.00,   49.95,  107.50, 'raptor-tp6m-google-geckoview',            "https://www.google.com"],
      [  527.66,  705.50,  159.72,    null,  463.00,  567.00, 1143.35,  418.50, 'raptor-tp6m-youtube-geckoview',           "https://www.youtube.com"],
      [  993.01, 3598.00,  932.82,    null,  595.50,  703.50,  429.84,  644.50, "raptor-tp6m-instagram-geckoview",         "https://www.instagram.com"],
      [  259.14,  185.00,   56.86,    null,  227.50,  658.00,  171.44,  162.50, "raptor-tp6m-bing-geckoview",              "https://www.bing.com"],
      [  361.23,  232.50,   47.55,    null,  290.00, 1232.00,  338.24,  204.50, "raptor-tp6m-bing-restaurants-geckoview",  "https://www.bing.com/search?q=restaurants"],
      [ 1032.03, 3262.00,  269.65,    null, 1037.00,  637.00,  131.94,  526.00, null,                                      "https://m.ebay-kleinanzeigen.de"],
      [ 1555.95, 7132.00,  562.12,    null, 1363.00,  839.00,  307.63,  718.00, null,                                      "https://m.ebay-kleinanzeigen.de/s-anzeigenulluf-zeit-wg-berlin/zimmer/c199-l3331"],
      [    null,    null,    null,    null,    null,    null,    null,    null, null,                                      "https://www.google.com/search?q=restaurants+near+me"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-booking-geckoview",           "https://booking.com"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-cnn-geckoview",               "https://cnn.com"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-cnn-ampstories-geckoview",    "https://cnn.com/ampstories/us/why-hurricane-michael-is-a-monster-unlike-any-other"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-amazon-search-geckoview",     "https://www.amazon.com/s/ref=nb_sb_noss_2/139-6317191-5622045?url=search-alias%3Daps&field-keywords=mobile+phone"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-wikipedia-geckoview",         "https://en.m.wikipedia.org/wiki/Main_Page"],
      [  678.69, 1128.00,  623.41,    null,  421.00,  876.50, 1434.85,  509.50, "raptor-tp6m-youtube-watch-geckoview",     "https://www.youtube.com/watch?v=COU5T-Wafa4"],
      [  631.41, 4479.00,    null,    null,  504.00,  279.00,    null,  251.50, "raptor-tp6m-reddit-geckoview",            "https://www.reddit.com"],
      [  739.87, 1077.00,    null,    null,  584.50, 1064.50,    null,  447.00, "raptor-tp6m-stackoverflow-geckoview",     "https://stackoverflow.com/"],
      [ 2578.20, 5451.50,    null,    null, 1006.00, 2972.50,    null, 2709.50, null,                                      "https://www.bbc.com/news/business-47245877"],
      [    null,    null,    null,    null,    null,    null,    null,    null, null,                                      "https://support.microsoft.com/en-us"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-jianshu-geckoview",           "https://www.jianshu.com/"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-imdb-geckoview",              "https://m.imdb.com/"],
      [ 3343.14, 8912.50, 3814.65,    null, 1816.50,    null,    null, 2307.50, "raptor-tp6m-allrecipes-geckoview",        "https://www.allrecipes.com/"],
      [    null,    null,    null,    null,    null,    null,    null,    null, "raptor-tp6m-espn-geckoview",              "http://www.espn.com/nba/story/_/page/allstarweekend25788027/the-comparison-lebron-james-michael-jordan-their-own-words"],
      [ 1307.48, 4326.50,  717.42,    null,  760.50,  955.50, 1271.75,  929.00, "raptor-tp6m-web-de-geckoview",            "https://web.de/magazine/politik/politologe-glaubt-grossen-koalition-herbst-knallen-33563566"],
    ]
  };

const reference = frum(fennec64.data).map(row=> ({platform, ...Data.zip(fennec64.header, row)}));

export { reference };

/**
 * Verified Media Sources Dictionary
 * 
 * Government-approved media sources for high-trust monitoring.
 * Sources are organized by category and region for easy maintenance.
 * 
 * Usage:
 * - Filter media articles to show only verified sources
 * - Display verified badge on article cards
 * - Ensure data quality for government monitoring
 * 
 * Maintenance:
 * - Add/remove sources in the appropriate category
 * - Update sourceUrls Set when making changes
 * - Keep alphabetically sorted within categories for readability
 */

export interface VerifiedMediaSource {
  zone: string;
  name: string;
  url: string;
  /** 
   * Source URI used by Event Registry API
   * This is the domain (e.g., "reuters.com", "bbc.com")
   */
  sourceUri: string;
}

/**
 * Verified Media Sources
 * 
 * Comprehensive list of verified media sources organized by region/category.
 * Total: 332 verified sources
 */
export const VERIFIED_MEDIA_SOURCES: VerifiedMediaSource[] = [
  // International News Agencies (7)
  { zone: "International news agencies", name: "Reuters (Nabras)", url: "https://www.reuters.com/", sourceUri: "reuters.com" },
  { zone: "International news agencies", name: "French AFP (Nabras)", url: "https://www.afp.com/", sourceUri: "afp.com" },
  { zone: "International news agencies", name: "German DPA (Nabras)", url: "https://www.dpa.com/", sourceUri: "dpa.com" },
  { zone: "International news agencies", name: "Russian Sputnik", url: "https://sputnikglobe.com/", sourceUri: "sputnikglobe.com" },
  { zone: "International news agencies", name: "Italian (Nabras)", url: "https://www.ansa.it/english/news/index.shtml", sourceUri: "ansa.it" },
  { zone: "International news agencies", name: "Associated Press", url: "https://www.ap.org/", sourceUri: "ap.org" },

  // Arab News Agencies (7)
  { zone: "Arab News Agencies", name: "WAS", url: "https://www.spa.gov.sa/", sourceUri: "spa.gov.sa" },
  { zone: "Arab News Agencies", name: "Kuwaiti", url: "https://www.kuna.net.kw/", sourceUri: "kuna.net.kw" },
  { zone: "Arab News Agencies", name: "Omani", url: "https://omannews.gov.om/", sourceUri: "omannews.gov.om" },
  { zone: "Arab News Agencies", name: "Bahraini", url: "https://www.bna.bh/en/", sourceUri: "bna.bh" },
  { zone: "Arab News Agencies", name: "Qatari", url: "https://www.qna.org.qa/", sourceUri: "qna.org.qa" },
  { zone: "Arab News Agencies", name: "Middle East News", url: "https://gulfnews.com/", sourceUri: "gulfnews.com" },
  { zone: "Arab News Agencies", name: "Saba", url: "https://www.saba.ye/", sourceUri: "saba.ye" },

  // Saudi (8)
  { zone: "Saudi", name: "Saudi Press Agency", url: "https://www.spa.gov.sa/", sourceUri: "spa.gov.sa" },
  { zone: "Saudi", name: "Sabq", url: "https://sabq.org/", sourceUri: "sabq.org" },
  { zone: "Saudi", name: "Okaz", url: "https://www.okaz.com.sa/", sourceUri: "okaz.com.sa" },
  { zone: "Saudi", name: "Mecca", url: "https://makkahnewspaper.com/", sourceUri: "makkahnewspaper.com" },
  { zone: "Saudi", name: "Riyadh", url: "https://www.alriyadhdaily.com/", sourceUri: "alriyadhdaily.com" },
  { zone: "Saudi", name: "Al-Bilad", url: "https://albiladdaily.com", sourceUri: "albiladdaily.com" },
  { zone: "Saudi", name: "Al-Marasid", url: "https://marasid.org/en/news_categories/news/", sourceUri: "marasid.org" },
  { zone: "Saudi", name: "Today", url: "https://www.alyaum.com/", sourceUri: "alyaum.com" },
  { zone: "Saudi", name: "Middle East", url: "https://al-marsd.com/", sourceUri: "al-marsd.com" },

  // Kuwait (5)
  { zone: "Kuwait", name: "Kuwait News Agency (KUNA)", url: "https://www.kuna.net.kw/", sourceUri: "kuna.net.kw" },
  { zone: "Kuwait", name: "Al-Rai", url: "https://www.alraimedia.com/", sourceUri: "alraimedia.com" },
  { zone: "Kuwait", name: "Al-Qabas", url: "https://www.alqabas.com/", sourceUri: "alqabas.com" },
  { zone: "Kuwait", name: "Al-Watan Kuwait", url: "http://alwatan.kuwait.tt/", sourceUri: "alwatan.kuwait.tt" },
  { zone: "Kuwait", name: "Al-Seyassah", url: "https://alseyassah.com/", sourceUri: "alseyassah.com" },
  { zone: "Kuwait", name: "Al-Sabah", url: "https://www.assabahnews.tn/ar/", sourceUri: "assabahnews.tn" },

  // Bahrain (4)
  { zone: "Bahrain", name: "Bahrain News Agency BNA", url: "https://www.bna.bh/", sourceUri: "bna.bh" },
  { zone: "Bahrain", name: "Al- Ayyam", url: "https://al-ayyam.ps/", sourceUri: "al-ayyam.ps" },
  { zone: "Bahrain", name: "Gulf News", url: "https://gulfnews.com/", sourceUri: "gulfnews.com" },
  { zone: "Bahrain", name: "Al-Watan Bahrain", url: "https://alwatannews.net/", sourceUri: "alwatannews.net" },

  // Sultanate of Oman (5)
  { zone: "Sultanate of Oman", name: "Oman News Agency", url: "https://omannews.gov.om/", sourceUri: "omannews.gov.om" },
  { zone: "Sultanate of Oman", name: "Oman Newspaper", url: "https://timesofoman.com/", sourceUri: "timesofoman.com" },
  { zone: "Sultanate of Oman", name: "Al-Shabiba", url: "https://shabiba.com/", sourceUri: "shabiba.com" },
  { zone: "Sultanate of Oman", name: "Oman's Homeland", url: "https://alwatan.om/", sourceUri: "alwatan.om" },
  { zone: "Sultanate of Oman", name: "Oman Affairs Website", url: "https://www.omaninfo.om/", sourceUri: "omaninfo.om" },

  // Qatar (4)
  { zone: "Qatar", name: "Qatar News Agency QNA", url: "https://www.qna.org.qa/", sourceUri: "qna.org.qa" },
  { zone: "Qatar", name: "Al Sharq", url: "https://al-sharq.com/", sourceUri: "al-sharq.com" },
  { zone: "Qatar", name: "Al-Raya", url: "https://www.raya.com/", sourceUri: "raya.com" },
  { zone: "Qatar", name: "Al-Watan", url: "https://www.al-watan.com/", sourceUri: "al-watan.com" },

  // Yemen (17)
  { zone: "Yemen", name: "Yemeni Gate", url: "https://bawabatii.com/", sourceUri: "bawabatii.com" },
  { zone: "Yemen", name: "Marib Press", url: "https://www.marebpress.net", sourceUri: "marebpress.net" },
  { zone: "Yemen", name: "Aden Post", url: "https://www.adenpost.net/", sourceUri: "adenpost.net" },
  { zone: "Yemen", name: "Here Aden", url: "https://huna-aden.com/", sourceUri: "huna-aden.com" },
  { zone: "Yemen", name: "Aden Time", url: "https://www.aden-tm.net/", sourceUri: "aden-tm.net" },
  { zone: "Yemen", name: "Yemen News", url: "https://www.yemenonline.info/", sourceUri: "yemenonline.info" },
  { zone: "Yemen", name: "Yemeni News", url: "https://www.saba.ye/en", sourceUri: "saba.ye" },
  { zone: "Yemen", name: "Yemen Voice", url: "https://ye-voice.com/", sourceUri: "ye-voice.com" },
  { zone: "Yemen", name: "Al-Ayyam", url: "https://al-ayyam.ps/ar", sourceUri: "al-ayyam.ps" },
  { zone: "Yemen", name: "Yemeni Scene", url: "https://www.almashhad.news/", sourceUri: "almashhad.news" },
  { zone: "Yemen", name: "Aden Tomorrow", url: "https://www.adngad.net/", sourceUri: "adngad.net" },
  { zone: "Yemen", name: "Al-Aman Net", url: "http://www.alaman.net/", sourceUri: "alaman.net" },
  { zone: "Yemen", name: "Yemen Now", url: "https://yemennownews.com/", sourceUri: "yemennownews.com" },
  { zone: "Yemen", name: "Hadramout Echo", url: "https://hadhramaut.info/", sourceUri: "hadhramaut.info" },
  { zone: "Yemen", name: "Al-Watan Al-Adaniya", url: "https://alwatanianews.com/", sourceUri: "alwatanianews.com" },
  { zone: "Yemen", name: "Yemeni Saba Agency", url: "https://www.ypagency.net/", sourceUri: "ypagency.net" },
  { zone: "Yemen", name: "December 2 Agency", url: "https://www.2dec.net/", sourceUri: "2dec.net" },
  { zone: "Yemen", name: "September 26 Net", url: "https://www.26sepnews.net/", sourceUri: "26sepnews.net" },

  // Iraq (8)
  { zone: "Iraq", name: "Baghdad Today", url: "https://baghdadtoday.news/", sourceUri: "baghdadtoday.news" },
  { zone: "Iraq", name: "Iraq Business News", url: "https://www.iraq-businessnews.com/", sourceUri: "iraq-businessnews.com" },
  { zone: "Iraq", name: "Al-Sumaria", url: "https://www.alsumaria.tv/news", sourceUri: "alsumaria.tv" },
  { zone: "Iraq", name: "Iraqi Rudaw", url: "https://www.rudawarabia.net/arabic", sourceUri: "rudawarabia.net" },
  { zone: "Iraq", name: "Iraqi Twilight", url: "https://www.shafaq.com/ar", sourceUri: "shafaq.com" },
  { zone: "Iraq", name: "Iraq News", url: "https://www.iraqinews.com/", sourceUri: "iraqinews.com" },
  { zone: "Iraq", name: "Al-Ahed Agency", url: "https://alahednews.news/", sourceUri: "alahednews.news" },
  { zone: "Iraq", name: "Iraqi Elections Website", url: "https://ihec.iq/", sourceUri: "ihec.iq" },
  { zone: "Iraq", name: "Iraqi News Agency", url: "https://ina.iq/", sourceUri: "ina.iq" },

  // Turkey (10)
  { zone: "Turkey", name: "Zaman", url: "https://www.zamanarabic.com/", sourceUri: "zamanarabic.com" },
  { zone: "Turkey", name: "Turk Press", url: "https://www.turkpress.co/", sourceUri: "turkpress.co" },
  { zone: "Turkey", name: "Turkish Affairs", url: "https://www.youm7.com/", sourceUri: "youm7.com" },
  { zone: "Turkey", name: "Turkey Now", url: "https://www.turkeyalaan.net/", sourceUri: "turkeyalaan.net" },
  { zone: "Turkey", name: "Turkish News Agency", url: "https://tr.agency/", sourceUri: "tr.agency" },
  { zone: "Turkey", name: "Yeni Şafak", url: "https://www.yenisafak.com/ar", sourceUri: "yenisafak.com" },
  { zone: "Turkey", name: "Daily Sabah", url: "https://www.dailysabah.com", sourceUri: "dailysabah.com" },
  { zone: "Turkey", name: "Ahval", url: "https://ahwal.sa/", sourceUri: "ahwal.sa" },
  { zone: "Turkey", name: "Anadolu", url: "https://www.aa.com.tr/ar", sourceUri: "aa.com.tr" },
  { zone: "Turkey", name: "Turkey Post", url: "https://newturkpost.com/", sourceUri: "newturkpost.com" },

  // Syria (6)
  { zone: "Syria", name: "Hawar News Agency", url: "https://hawarnews.com/ar/", sourceUri: "hawarnews.com" },
  { zone: "Syria", name: "Syrian Observatory", url: "https://www.syriahr.com/en/", sourceUri: "syriahr.com" },
  { zone: "Syria", name: "Orient Net", url: "https://orient-news.net/en", sourceUri: "orient-news.net" },
  { zone: "Syria", name: "Syrian Days", url: "https://syriandays.com/", sourceUri: "syriandays.com" },
  { zone: "Syria", name: "Qasioun Agency", url: "https://qasioun.com.sa/home", sourceUri: "qasioun.com.sa" },
  { zone: "Syria", name: "The Syrian Solution", url: "https://7al.net/", sourceUri: "7al.net" },

  // Libya (9)
  { zone: "Libya", name: "Al-Wasat", url: "https://alwasat.ly/", sourceUri: "alwasat.ly" },
  { zone: "Libya", name: "Africa Portal", url: "https://www.afrigatenews.net/section/%D9%84%D9%8A%D8%A8%D9%8A%D8%A7/", sourceUri: "afrigatenews.net" },
  { zone: "Libya", name: "Libya News 24", url: "https://akhbarlibya24.net/", sourceUri: "akhbarlibya24.net" },
  { zone: "Libya", name: "Libya Channel", url: "https://libyaschannel.com/", sourceUri: "libyaschannel.com" },
  { zone: "Libya", name: "Libya 24 Channel", url: "https://libya24.tv/", sourceUri: "libya24.tv" },
  { zone: "Libya", name: "Ewan Libya", url: "https://www.ewanlibya.com", sourceUri: "ewanlibya.com" },
  { zone: "Libya", name: "24 Hours", url: "https://www.alsaaa24.com/", sourceUri: "alsaaa24.com" },
  { zone: "Libya", name: "Channel 218", url: "https://www.tvlibya.net/", sourceUri: "tvlibya.net" },
  { zone: "Libya", name: "Libya Event", url: "https://libyanevents.ly/", sourceUri: "libyanevents.ly" },
  { zone: "Libya", name: "The Observatory", url: "https://almarsad.co", sourceUri: "almarsad.co" },

  // Algeria (9)
  { zone: "Algeria", name: "Al-Khabar", url: "https://www.elkhabar.com/", sourceUri: "elkhabar.com" },
  { zone: "Algeria", name: "Al-Bilad", url: "https://www.elbilad.net/", sourceUri: "elbilad.net" },
  { zone: "Algeria", name: "Today's News", url: "https://www.algierstoday.com/", sourceUri: "algierstoday.com" },
  { zone: "Algeria", name: "Al-Shorouk", url: "https://www.shorouknews.com/", sourceUri: "shorouknews.com" },
  { zone: "Algeria", name: "Algeria Now", url: "https://algeriemaintenant.dz/", sourceUri: "algeriemaintenant.dz" },
  { zone: "Algeria", name: "Algerian News", url: "https://al24news.dz/", sourceUri: "al24news.dz" },
  { zone: "Algeria", name: "Algerian Radio", url: "https://radioalgerie.dz/player/ar", sourceUri: "radioalgerie.dz" },
  { zone: "Algeria", name: "Algerian News Agency", url: "https://www.aps.dz/en", sourceUri: "aps.dz" },
  { zone: "Algeria", name: "TSA Algeria", url: "https://www.tsa-algerie.com/", sourceUri: "tsa-algerie.com" },
  { zone: "Algeria", name: "Algerian Morning", url: "https://www.ennaharonline.com/", sourceUri: "ennaharonline.com" },

  // Tunisia (17)
  { zone: "Tunis", name: "Echo of Tunisia", url: "https://lechotunisien.com/", sourceUri: "lechotunisien.com" },
  { zone: "Tunis", name: "Al-Sabah", url: "https://assabah.ma/", sourceUri: "assabah.ma" },
  { zone: "Tunis", name: "Al-Sharq Al-Magharibi", url: "https://almagharibia.tv/", sourceUri: "almagharibia.tv" },
  { zone: "Tunis", name: "Digital Tunisia", url: "https://ar.tunisienumerique.com/amp/", sourceUri: "tunisienumerique.com" },
  { zone: "Tunis", name: "Al-Manbar", url: "https://almanbar.ma/", sourceUri: "almanbar.ma" },
  { zone: "Tunis", name: "Al-Sabah News", url: "https://www.assabahnews.tn/ar/", sourceUri: "assabahnews.tn" },
  { zone: "Tunis", name: "The Witness Tunisia Y", url: "https://www.witness.org/tag/tunisia/", sourceUri: "witness.org" },
  { zone: "Tunis", name: "Radio Chams FM", url: "https://radioenlignefrance.com/shems-fm", sourceUri: "radioenlignefrance.com" },
  { zone: "Tunis", name: "Al-Shorouk", url: "https://www.shorouknews.com/", sourceUri: "shorouknews.com" },
  { zone: "Tunis", name: "Tunisie Telegraph", url: "https://tunisie-telegraph.com/", sourceUri: "tunisie-telegraph.com" },
  { zone: "Tunis", name: "Al-Jarida", url: "https://www.aljarida.com/", sourceUri: "aljarida.com" },
  { zone: "Tunis", name: "Tunisie Numérique", url: "https://www.tunisienumerique.com", sourceUri: "tunisienumerique.com" },
  { zone: "Tunis", name: "Tunisie Numérique (French)", url: "https://www.tunisienumerique.com/", sourceUri: "tunisienumerique.com" },
  { zone: "Tunis", name: "La Presse (French)", url: "https://www.lapresse.ca/", sourceUri: "lapresse.ca" },
  { zone: "Tunis", name: "Réalité (French)", url: "https://realites.com.tn/fr/amp/", sourceUri: "realites.com.tn" },
  { zone: "Tunis", name: "Capitalis Tunisie", url: "https://kapitalis.com/tunisie/", sourceUri: "kapitalis.com" },
  { zone: "Tunis", name: "Mosaïque FM", url: "https://www.tunisie-radio.com/mosaique-fm", sourceUri: "tunisie-radio.com" },

  // Morocco (9)
  { zone: "Morocco", name: "Zenga 20", url: "https://rue20.com/", sourceUri: "rue20.com" },
  { zone: "Morocco", name: "Morocco Today", url: "https://www.almaghribtoday.net/en/", sourceUri: "almaghribtoday.net" },
  { zone: "Morocco", name: "Morocco Intelligence", url: "https://www.maghreb-intelligence.com/", sourceUri: "maghreb-intelligence.com" },
  { zone: "Morocco", name: "Hiba Press", url: "https://ar.hibapress.com/", sourceUri: "hibapress.com" },
  { zone: "Morocco", name: "360", url: "https://fr.le360.ma/", sourceUri: "le360.ma" },
  { zone: "Morocco", name: "Moroccan Morning", url: "https://lematin.ma/", sourceUri: "lematin.ma" },
  { zone: "Morocco", name: "Moroccan Newspaper", url: "https://www.assahifa.com/", sourceUri: "assahifa.com" },
  { zone: "Morocco", name: "Hespress", url: "https://www.hespress.com/", sourceUri: "hespress.com" },
  { zone: "Morocco", name: "Agadir 24", url: "https://agadir24.info/", sourceUri: "agadir24.info" },

  // Sudan (5)
  { zone: "Sudan", name: "Al-Ahdath News", url: "https://www.alhadath.net/", sourceUri: "alhadath.net" },
  { zone: "Sudan", name: "Al-Rakoba Al-Sudaniya", url: "https://www.alrakoba.net/", sourceUri: "alrakoba.net" },
  { zone: "Sudan", name: "Sudan Tribune", url: "https://sudantribune.com/", sourceUri: "sudantribune.com" },
  { zone: "Sudan", name: "Al-Sudani Newspaper", url: "https://alsudaninews.com/", sourceUri: "alsudaninews.com" },
  { zone: "Sudan", name: "Al-Nilein", url: "https://www.alnilin.com/", sourceUri: "alnilin.com" },

  // British Newspapers (10)
  { zone: "British Newspapers", name: "The Times", url: "https://www.thetimes.com/", sourceUri: "thetimes.com" },
  { zone: "British Newspapers", name: "The Guardian", url: "https://www.theguardian.com/uk", sourceUri: "theguardian.com" },
  { zone: "British Newspapers", name: "The Telegraph", url: "https://www.telegraph.co.uk/", sourceUri: "telegraph.co.uk" },
  { zone: "British Newspapers", name: "The Independent", url: "https://www.independent.co.uk/", sourceUri: "independent.co.uk" },
  { zone: "British Newspapers", name: "The Financial Times", url: "https://www.ft.com/", sourceUri: "ft.com" },
  { zone: "British Newspapers", name: "Daily Mail", url: "https://www.dailymail.co.uk/home/index.html", sourceUri: "dailymail.co.uk" },
  { zone: "British Newspapers", name: "The Express", url: "https://www.express.co.uk/", sourceUri: "express.co.uk" },
  { zone: "British Newspapers", name: "The Sun", url: "https://www.thesun.co.uk/", sourceUri: "thesun.co.uk" },
  { zone: "British Newspapers", name: "BBC", url: "https://www.bbc.com/", sourceUri: "bbc.com" },

  // American Newspapers (16)
  { zone: "American Newspapers", name: "The New York Times", url: "https://www.nytimes.com/", sourceUri: "nytimes.com" },
  { zone: "American Newspapers", name: "The Wall Street Journal", url: "https://www.wsj.com/", sourceUri: "wsj.com" },
  { zone: "American Newspapers", name: "USA Today", url: "https://www.usatoday.com/", sourceUri: "usatoday.com" },
  { zone: "American Newspapers", name: "Al-Monitor", url: "https://www.al-monitor.com/", sourceUri: "al-monitor.com" },
  { zone: "American Newspapers", name: "Washington Post", url: "https://www.washingtonpost.com/", sourceUri: "washingtonpost.com" },
  { zone: "American Newspapers", name: "Los Angeles Times", url: "https://www.latimes.com/", sourceUri: "latimes.com" },
  { zone: "American Newspapers", name: "Foreign Policy", url: "https://foreignpolicy.com/", sourceUri: "foreignpolicy.com" },
  { zone: "American Newspapers", name: "Axios", url: "https://www.axios.com/", sourceUri: "axios.com" },
  { zone: "American Newspapers", name: "The Hill", url: "https://thehill.com/", sourceUri: "thehill.com" },
  { zone: "American Newspapers", name: "Fox News", url: "https://www.foxnews.com/", sourceUri: "foxnews.com" },
  { zone: "American Newspapers", name: "Washington Times", url: "https://www.washingtontimes.com/", sourceUri: "washingtontimes.com" },
  { zone: "American Newspapers", name: "Politico", url: "https://www.politico.com/", sourceUri: "politico.com" },
  { zone: "American Newspapers", name: "S Y N N", url: "https://www.snntv.com/", sourceUri: "snntv.com" },
  { zone: "American Newspapers", name: "The Economist", url: "https://www.economist.com/", sourceUri: "economist.com" },
  { zone: "American Newspapers", name: "Foreign Affairs", url: "https://www.foreignaffairs.com/", sourceUri: "foreignaffairs.com" },
  { zone: "American Newspapers", name: "National Post", url: "https://nationalpost.com/", sourceUri: "nationalpost.com" },
  { zone: "American Newspapers", name: "CBS News", url: "https://www.cbsnews.com/", sourceUri: "cbsnews.com" },
  { zone: "American Newspapers", name: "The Daily Beast", url: "https://www.thedailybeast.com/", sourceUri: "thedailybeast.com" },

  // French newspapers (8)
  { zone: "French newspapers", name: "Le Monde", url: "https://www.lemonde.fr/", sourceUri: "lemonde.fr" },
  { zone: "French newspapers", name: "Le Figaro", url: "https://www.lefigaro.fr/", sourceUri: "lefigaro.fr" },
  { zone: "French newspapers", name: "Libération", url: "https://www.liberation.fr/", sourceUri: "liberation.fr" },
  { zone: "French newspapers", name: "Mondafrique", url: "https://mondafrique.com/", sourceUri: "mondafrique.com" },
  { zone: "French newspapers", name: "La Tribune", url: "https://www.latribune.fr/quotidien", sourceUri: "latribune.fr" },
  { zone: "French newspapers", name: "Le Point", url: "https://www.lepoint.fr/", sourceUri: "lepoint.fr" },
  { zone: "French newspapers", name: "Lexpace France", url: "https://www.lexpress.fr/", sourceUri: "lexpress.fr" },
  { zone: "French newspapers", name: "Radio Monte Carlo", url: "https://www.radiomontecarlo.net/", sourceUri: "radiomontecarlo.net" },
  { zone: "French newspapers", name: "Radio France Internationale", url: "https://www.rfi.fr/fr/", sourceUri: "rfi.fr" },

  // European newspapers and magazines (38)
  { zone: "European newspapers and magazines", name: "Der Spiegel (Germany)", url: "https://www.spiegel.de/", sourceUri: "spiegel.de" },
  { zone: "European newspapers and magazines", name: "German Tagesspiegel", url: "https://www.tagesspiegel.de/", sourceUri: "tagesspiegel.de" },
  { zone: "European newspapers and magazines", name: "German Focus", url: "https://www.focus.de/", sourceUri: "focus.de" },
  { zone: "European newspapers and magazines", name: "German Zeit", url: "https://www.zeit.de/index", sourceUri: "zeit.de" },
  { zone: "European newspapers and magazines", name: "DW German channel", url: "https://www.dw.com/en/top-stories/s-9097", sourceUri: "dw.com" },
  { zone: "European newspapers and magazines", name: "Bild (Germany)", url: "https://www.dw.com/en/top-stories/s-909", sourceUri: "dw.com" },
  { zone: "European newspapers and magazines", name: "Italian Il Giornale", url: "https://www.ilgiornale.it/", sourceUri: "ilgiornale.it" },
  { zone: "European newspapers and magazines", name: "Italian Formiche", url: "https://formiche.net/", sourceUri: "formiche.net" },
  { zone: "European newspapers and magazines", name: "Ansa, Italy", url: "https://www.ansa.it/", sourceUri: "ansa.it" },
  { zone: "European newspapers and magazines", name: "Starte Magazzini, Italy", url: "https://www.startmag.it/", sourceUri: "startmag.it" },
  { zone: "European newspapers and magazines", name: "La Stampa, Italy", url: "https://www.lastampa.it/", sourceUri: "lastampa.it" },
  { zone: "European newspapers and magazines", name: "Italian Agenzia", url: "https://www.agi.it/", sourceUri: "agi.it" },
  { zone: "European newspapers and magazines", name: "ABC Spain", url: "https://www.abc.es/espana/", sourceUri: "abc.es" },
  { zone: "European newspapers and magazines", name: "El Mundo (Spain)", url: "https://www.elmundo.es/", sourceUri: "elmundo.es" },
  { zone: "European newspapers and magazines", name: "El Español, Spain", url: "https://www.elespanol.com/", sourceUri: "elespanol.com" },
  { zone: "European newspapers and magazines", name: "El País (Spain)", url: "https://elpais.com/", sourceUri: "elpais.com" },
  { zone: "European newspapers and magazines", name: "The Courier (Scotland)", url: "https://www.thecourier.co.uk/", sourceUri: "thecourier.co.uk" },
  { zone: "European newspapers and magazines", name: "The Herald (Scotland)", url: "https://www.heraldscotland.com/", sourceUri: "heraldscotland.com" },
  { zone: "European newspapers and magazines", name: "The National (Scotland)", url: "https://www.thenational.scot/", sourceUri: "thenational.scot" },
  { zone: "European newspapers and magazines", name: "European Reporter", url: "https://www.eureporter.co/", sourceUri: "eureporter.co" },
  { zone: "European newspapers and magazines", name: "Euro News", url: "https://www.euronews.com/", sourceUri: "euronews.com" },
  { zone: "European newspapers and magazines", name: "Toronto Sun (Canada)", url: "https://torontosun.com/", sourceUri: "torontosun.com" },
  { zone: "European newspapers and magazines", name: "L'Express (Switzerland)", url: "https://www.lexpress.fr/", sourceUri: "lexpress.fr" },
  { zone: "European newspapers and magazines", name: "Swissinfo Swiss", url: "https://www.swissinfo.ch/fre/", sourceUri: "swissinfo.ch" },
  { zone: "European newspapers and magazines", name: "Belarusian Nikesta", url: "https://sotavision.world/", sourceUri: "sotavision.world" },
  { zone: "European newspapers and magazines", name: "Armenian Hedk", url: "https://www.hetq.am/en", sourceUri: "hetq.am" },
  { zone: "European newspapers and magazines", name: "Masist Post - Armenian", url: "https://massispost.com/", sourceUri: "massispost.com" },
  { zone: "European newspapers and magazines", name: "Armen Press (Armenia)", url: "https://armenpress.am/en", sourceUri: "armenpress.am" },
  { zone: "European newspapers and magazines", name: "Armenian Htk", url: "https://hetq.am/en", sourceUri: "hetq.am" },
  { zone: "European newspapers and magazines", name: "Azar News - Azerbaijan", url: "https://www.azernews.az/", sourceUri: "azernews.az" },
  { zone: "European newspapers and magazines", name: "News Armenia", url: "https://news.am/arm/", sourceUri: "news.am" },
  { zone: "European newspapers and magazines", name: "Armenian Asparez", url: "https://asbarez.com/", sourceUri: "asbarez.com" },
  { zone: "European newspapers and magazines", name: "Azerbaijan's Azertac", url: "https://azertag.az/", sourceUri: "azertag.az" },
  { zone: "European newspapers and magazines", name: "Ukrainian agency Ukrinform", url: "https://www.ukrinform.net/", sourceUri: "ukrinform.net" },
  { zone: "European newspapers and magazines", name: "Ukrainian channel Next", url: "https://nexta.tv/en/", sourceUri: "nexta.tv" },
  { zone: "European newspapers and magazines", name: "Ukrainian Interfax Agency", url: "https://en.interfax.com.ua/", sourceUri: "interfax.com.ua" },

  // Research and Studies Center (9)
  { zone: "Research and Studies Center", name: "Washington Institute", url: "https://www.washingtoninstitute.org/", sourceUri: "washingtoninstitute.org" },
  { zone: "Research and Studies Center", name: "Intelligence Online", url: "https://www.intelligenceonline.com/", sourceUri: "intelligenceonline.com" },
  { zone: "Research and Studies Center", name: "Africa Intelligence", url: "https://www.africaintelligence.com/", sourceUri: "africaintelligence.com" },
  { zone: "Research and Studies Center", name: "Foreign Affairs", url: "https://www.foreignaffairs.com/", sourceUri: "foreignaffairs.com" },
  { zone: "Research and Studies Center", name: "Nordic Monitor", url: "https://nordicmonitor.com/", sourceUri: "nordicmonitor.com" },
  { zone: "Research and Studies Center", name: "Begin-Sadat Center", url: "https://besacenter.org/", sourceUri: "besacenter.org" },
  { zone: "Research and Studies Center", name: "Stratfor", url: "https://worldview.stratfor.com/", sourceUri: "stratfor.com" },
  { zone: "Research and Studies Center", name: "Nordic Monitor Sweden", url: "https://nordicmonitor.com/", sourceUri: "nordicmonitor.com" },
  { zone: "Research and Studies Center", name: "Carnegie", url: "https://carnegieendowment.org/?lang=en", sourceUri: "carnegieendowment.org" },
  { zone: "Research and Studies Center", name: "The Atlas Council", url: "https://www.atlanticcouncil.org/", sourceUri: "atlanticcouncil.org" },

  // Russian newspapers and websites (11)
  { zone: "Russian newspapers and websites", name: "Russia Today", url: "https://russiatoday.ru/russia", sourceUri: "russiatoday.ru" },
  { zone: "Russian newspapers and websites", name: "Sputnik", url: "https://sputnikglobe.com/", sourceUri: "sputnikglobe.com" },
  { zone: "Russian newspapers and websites", name: "Russian Interfax", url: "https://www.interfax.ru/", sourceUri: "interfax.ru" },
  { zone: "Russian newspapers and websites", name: "Vzglyad", url: "https://vz.ru/", sourceUri: "vz.ru" },
  { zone: "Russian newspapers and websites", name: "TASS", url: "https://tass.com/", sourceUri: "tass.com" },
  { zone: "Russian newspapers and websites", name: "Russian Kommersant", url: "https://www.kommersant.ru/", sourceUri: "kommersant.ru" },
  { zone: "Russian newspapers and websites", name: "Russian Izvestia", url: "https://iz.ru/news", sourceUri: "iz.ru" },
  { zone: "Russian newspapers and websites", name: "Eurasia Daily", url: "https://eadaily.com/ru/", sourceUri: "eadaily.com" },
  { zone: "Russian newspapers and websites", name: "Russian Pravda", url: "https://www.pravda.ru/", sourceUri: "pravda.ru" },
  { zone: "Russian newspapers and websites", name: "RIA Novosti", url: "https://ria.ru/", sourceUri: "ria.ru" },
  { zone: "Russian newspapers and websites", name: "Moscow Times", url: "https://www.themoscowtimes.com/", sourceUri: "themoscowtimes.com" },
  { zone: "Russian newspapers and websites", name: "Lenta", url: "https://lenta.ru/", sourceUri: "lenta.ru" },

  // Australian newspapers (4)
  { zone: "Australian newspapers", name: "The Australian", url: "https://www.theaustralian.com.au/", sourceUri: "theaustralian.com.au" },
  { zone: "Australian newspapers", name: "The Sydney Morning Herald", url: "https://www.smh.com.au/", sourceUri: "smh.com.au" },
  { zone: "Australian newspapers", name: "The Age", url: "https://www.theage.com.au/", sourceUri: "theage.com.au" },
  { zone: "Australian newspapers", name: "The Canberra Times", url: "https://www.canberratimes.com.au/", sourceUri: "canberratimes.com.au" },

  // Israeli newspapers (6)
  { zone: "Israeli newspapers", name: "Jerusalem Post", url: "https://www.jpost.com/", sourceUri: "jpost.com" },
  { zone: "Israeli newspapers", name: "Haaretz", url: "https://www.haaretz.com/", sourceUri: "haaretz.com" },
  { zone: "Israeli newspapers", name: "Israel Hayom", url: "https://www.israelhayom.com/", sourceUri: "israelhayom.com" },
  { zone: "Israeli newspapers", name: "i24News Israeli channel", url: "https://www.i24news.tv/he", sourceUri: "i24news.tv" },
  { zone: "Israeli newspapers", name: "Yedioth Ahronoth", url: "https://www.ynetnews.com/category/3083", sourceUri: "ynetnews.com" },
  { zone: "Israeli newspapers", name: "The Times of Israel", url: "https://www.timesofisrael.com/", sourceUri: "timesofisrael.com" },

  // Asian Newspapers (19)
  { zone: "Asian Newspapers", name: "Malay Mail (Malaysia)", url: "https://www.malaymail.com/", sourceUri: "malaymail.com" },
  { zone: "Asian Newspapers", name: "The Edge Markets Malaysian", url: "https://theedgemalaysia.com/", sourceUri: "theedgemalaysia.com" },
  { zone: "Asian Newspapers", name: "China Daily", url: "https://www.chinadaily.com.cn/", sourceUri: "chinadaily.com.cn" },
  { zone: "Asian Newspapers", name: "South China Morning News Chinese", url: "https://www.scmp.com/", sourceUri: "scmp.com" },
  { zone: "Asian Newspapers", name: "The News, Pakistan", url: "https://www.thenews.com.pk/", sourceUri: "thenews.com.pk" },
  { zone: "Asian Newspapers", name: "The Dawn, Pakistan", url: "https://www.dawn.com/", sourceUri: "dawn.com" },
  { zone: "Asian Newspapers", name: "Tribune Pakistan", url: "https://tribune.com.pk/", sourceUri: "tribune.com.pk" },
  { zone: "Asian Newspapers", name: "Times of India", url: "https://timesofindia.indiatimes.com/", sourceUri: "timesofindia.indiatimes.com" },
  { zone: "Asian Newspapers", name: "The Hindu", url: "https://www.thehindu.com/", sourceUri: "thehindu.com" },
  { zone: "Asian Newspapers", name: "Economic Times (India)", url: "https://economictimes.indiatimes.com/", sourceUri: "economictimes.indiatimes.com" },
  { zone: "Asian Newspapers", name: "Tolo News Afghanistan", url: "https://tolonews.com/afghanistan", sourceUri: "tolonews.com" },
  { zone: "Asian Newspapers", name: "Khamma Press (Afghanistan)", url: "https://www.khaama.com/", sourceUri: "khaama.com" },
  { zone: "Asian Newspapers", name: "Eurasia Review - Asia", url: "https://www.eurasiareview.com/", sourceUri: "eurasiareview.com" },
  { zone: "Asian Newspapers", name: "The Asian Diplomat", url: "https://thediplomat.com/", sourceUri: "thediplomat.com" },
  { zone: "Asian Newspapers", name: "Free Malaysia", url: "https://www.freemalaysiatoday.com/", sourceUri: "freemalaysiatoday.com" },
  { zone: "Asian Newspapers", name: "Myanmar Now", url: "https://myanmar-now.org/en/", sourceUri: "myanmar-now.org" },
  { zone: "Asian Newspapers", name: "Myanmar Times", url: "https://www.mmtimes.com/", sourceUri: "mmtimes.com" },
  { zone: "Asian Newspapers", name: "The Diplomat", url: "https://thediplomat.com/", sourceUri: "thediplomat.com" },
  { zone: "Asian Newspapers", name: "Japan Times", url: "https://www.japantimes.co.jp/", sourceUri: "japantimes.co.jp" },
  { zone: "Asian Newspapers", name: "The Irrawaddy Myanmar", url: "https://www.irrawaddy.com/", sourceUri: "irrawaddy.com" },
  { zone: "Asian Newspapers", name: "Kyrgyzstan's Aki Press", url: "https://akipress.com/", sourceUri: "akipress.com" },
  { zone: "Asian Newspapers", name: "Global China Network", url: "https://www.cgtn.com/", sourceUri: "cgtn.com" },

  // Latin American Newspapers and News (9)
  { zone: "Latin American Newspapers and News", name: "Globo (Brazil)", url: "https://oglobo.globo.com/", sourceUri: "oglobo.globo.com" },
  { zone: "Latin American Newspapers and News", name: "Confidencial (Nicaragua)", url: "https://confidencial.digital/", sourceUri: "confidencial.digital" },
  { zone: "Latin American Newspapers and News", name: "El Mostrador (Chile)", url: "https://www.elmostrador.cl/", sourceUri: "elmostrador.cl" },
  { zone: "Latin American Newspapers and News", name: "Economista (Argentina)", url: "https://eleconomista.com.ar/", sourceUri: "eleconomista.com.ar" },
  { zone: "Latin American Newspapers and News", name: "Brazilian Poder 360", url: "https://www.poder360.com.br/", sourceUri: "poder360.com.br" },
  { zone: "Latin American Newspapers and News", name: "Ambito (Argentina)", url: "https://www.ambito.com/", sourceUri: "ambito.com" },
  { zone: "Latin American Newspapers and News", name: "Clarín (Argentina)", url: "https://www.clarin.com/", sourceUri: "clarin.com" },
  { zone: "Latin American Newspapers and News", name: "Infobae Argentina", url: "https://www.infobae.com/tag/argentina/", sourceUri: "infobae.com" },
  { zone: "Latin American Newspapers and News", name: "Brazil 247", url: "https://www.brasil247.com/", sourceUri: "brasil247.com" },

  // African newspapers (6)
  { zone: "African newspapers", name: "Chad Herald", url: "https://www.chadherald.com/", sourceUri: "chadherald.com" },
  { zone: "African newspapers", name: "Chad Info", url: "https://tchadinfos.com/", sourceUri: "tchadinfos.com" },
  { zone: "African newspapers", name: "Mali Act - Finance", url: "https://maliactu.net/", sourceUri: "maliactu.net" },
  { zone: "African newspapers", name: "Bamada - Mali", url: "https://bamada.net/", sourceUri: "bamada.net" },
  { zone: "African newspapers", name: "Jeune Afrique", url: "https://www.jeuneafrique.com/", sourceUri: "jeuneafrique.com" },
  { zone: "African newspapers", name: "Mali Jet", url: "https://malijet.com/", sourceUri: "malijet.com" },

  // Iran (33)
  { zone: "Iran", name: "Arman Melli", url: "https://www.armanmeli.ir", sourceUri: "armanmeli.ir" },
  { zone: "Iran", name: "Farda News", url: "https://www.fardanews.com/", sourceUri: "fardanews.com" },
  { zone: "Iran", name: "Hamshahri", url: "https://www.hamshahrionline.ir/", sourceUri: "hamshahrionline.ir" },
  { zone: "Iran", name: "Aftab", url: "https://aftabnews.ir/", sourceUri: "aftabnews.ir" },
  { zone: "Iran", name: "Contemporary Rahbard", url: "https://rahbordemoaser.ir/", sourceUri: "rahbordemoaser.ir" },
  { zone: "Iran", name: "Economy News", url: "https://economy-news.net/", sourceUri: "economy-news.net" },
  { zone: "Iran", name: "Tabnak", url: "https://www.tabnak.ir/ar", sourceUri: "tabnak.ir" },
  { zone: "Iran", name: "Sharq", url: "https://asharq.com/", sourceUri: "asharq.com" },
  { zone: "Iran", name: "Iranian Eikna", url: "https://iqna.ir/ar", sourceUri: "iqna.ir" },
  { zone: "Iran", name: "Information", url: "https://www.ettelaat.com/", sourceUri: "ettelaat.com" },
  { zone: "Iran", name: "Tasnim", url: "http://www.tasnimnews.com/ar", sourceUri: "tasnimnews.com" },
  { zone: "Iran", name: "ISNA", url: "https://ar.isna.ir/", sourceUri: "isna.ir" },
  { zone: "Iran", name: "Dunya-ye-Ekonomi", url: "https://donya-e-eqtesad.com/", sourceUri: "donya-e-eqtesad.com" },
  { zone: "Iran", name: "Iranian Foreign Ministry", url: "https://ar.mfa.gov.ir/", sourceUri: "mfa.gov.ir" },
  { zone: "Iran", name: "Arna", url: "https://ar.irna.ir/", sourceUri: "irna.ir" },
  { zone: "Iran", name: "Shafaqna", url: "https://ar.shafaqna.com/", sourceUri: "shafaqna.com" },
  { zone: "Iran", name: "Elna", url: "https://www.ilna.ir/", sourceUri: "ilna.ir" },
  { zone: "Iran", name: "Mehr", url: "https://ar.mehrnews.com/", sourceUri: "mehrnews.com" },
  { zone: "Iran", name: "Young Reporters Club", url: "https://www.yjc.ir/ar", sourceUri: "yjc.ir" },
  { zone: "Iran", name: "Election", url: "https://www.elections.eg/", sourceUri: "elections.eg" },
  { zone: "Iran", name: "Accreditation", url: "https://portal.etimad.sa/", sourceUri: "etimad.sa" },
  { zone: "Iran", name: "Joan", url: "https://www.javanonline.ir/", sourceUri: "javanonline.ir" },
  { zone: "Iran", name: "Erib", url: "https://www.iribnews.ir/", sourceUri: "iribnews.ir" },
  { zone: "Iran", name: "Student Agency", url: "https://ar.isna.ir/", sourceUri: "isna.ir" },
  { zone: "Iran", name: "Jahan Sanat", url: "https://jahanesanat.ir/", sourceUri: "jahanesanat.ir" },
  { zone: "Iran", name: "Faroo", url: "https://fararu.com/", sourceUri: "fararu.com" },
  { zone: "Iran", name: "24 Hours", url: "https://www.saat24.news/", sourceUri: "saat24.news" },
  { zone: "Iran", name: "Radio Farda", url: "https://www.radiofarda.com/", sourceUri: "radiofarda.com" },
  { zone: "Iran", name: "Watan Emrouz", url: "https://iranjournal.org", sourceUri: "iranjournal.org" },
  { zone: "Iran", name: "Iran Newspaper", url: "https://iranjournal.org/", sourceUri: "iranjournal.org" },
  { zone: "Iran", name: "Alf Website", url: "https://alf.website/en/", sourceUri: "alf.website" },
  { zone: "Iran", name: "Fars News Agency", url: "https://farsnews.ir/arabic", sourceUri: "farsnews.ir" },
  { zone: "Iran", name: "Parliament Agency (Khan Molt)", url: "https://www.parlement.ma/", sourceUri: "parlement.ma" },
  { zone: "Iran", name: "Khabar Online", url: "https://www.khabaronline.ir/", sourceUri: "khabaronline.ir" },
  { zone: "Iran", name: "Jam Jam", url: "https://jamejamonline.ir/", sourceUri: "jamejamonline.ir" },
  { zone: "Iran", name: "Iranian era", url: "https://www.asriran.com/", sourceUri: "asriran.com" },
  { zone: "Iran", name: "Islamic Republic", url: "https://www.irna.ir/", sourceUri: "irna.ir" },
  { zone: "Iran", name: "Iran International", url: "https://www.iranintl.com/", sourceUri: "iranintl.com" },
  { zone: "Iran", name: "Radio Tehran", url: "https://radiotehran.ir/", sourceUri: "radiotehran.ir" },
  { zone: "Iran", name: "Ibtikar", url: "https://ebtekarnews.com/", sourceUri: "ebtekarnews.com" },
  { zone: "Iran", name: "BBC Persian", url: "https://www.bbc.com/persian", sourceUri: "bbc.com" },
];

/**
 * Set of verified source URIs for fast lookup
 * 
 * Use this for O(1) verification checks when filtering articles.
 */
export const VERIFIED_SOURCE_URIS = new Set<string>(
  VERIFIED_MEDIA_SOURCES.map(source => source.sourceUri)
);

/**
 * Check if a source URI is verified
 * 
 * @param sourceUri - Source URI to check (e.g., "bbc.com", "reuters.com")
 * @returns true if source is verified, false otherwise
 * 
 * @example
 * ```ts
 * if (isVerifiedSource("reuters.com")) {
 *   // Show verified badge
 * }
 * ```
 */
export function isVerifiedSource(sourceUri: string): boolean {
  if (!sourceUri) return false;
  return VERIFIED_SOURCE_URIS.has(sourceUri);
}

/**
 * Get verified source details by URI
 * 
 * @param sourceUri - Source URI to lookup
 * @returns Verified source details or null if not verified
 */
export function getVerifiedSourceDetails(
  sourceUri: string
): VerifiedMediaSource | null {
  return VERIFIED_MEDIA_SOURCES.find(s => s.sourceUri === sourceUri) || null;
}

/**
 * Get all verified sources by zone
 * 
 * @param zone - Zone name to filter by (e.g., "British Newspapers")
 * @returns Array of verified sources in the zone
 */
export function getVerifiedSourcesByZone(zone: string): VerifiedMediaSource[] {
  return VERIFIED_MEDIA_SOURCES.filter(s => s.zone === zone);
}

/**
 * Get all unique zones
 * 
 * @returns Array of unique zone names, sorted alphabetically
 */
export function getAllVerifiedZones(): string[] {
  const zones = new Set(VERIFIED_MEDIA_SOURCES.map(s => s.zone));
  return Array.from(zones).sort();
}

/**
 * Statistics about verified media sources
 */
export const VERIFIED_MEDIA_STATS = {
  totalSources: VERIFIED_MEDIA_SOURCES.length,
  totalZones: new Set(VERIFIED_MEDIA_SOURCES.map(s => s.zone)).size,
  sourcesByZone: VERIFIED_MEDIA_SOURCES.reduce((acc, source) => {
    acc[source.zone] = (acc[source.zone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
};


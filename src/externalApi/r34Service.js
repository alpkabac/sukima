const scraperJs = require('scraperjs');

function scrapper(url, mapFnc, thenFnc) {
    scraperJs.StaticScraper.create(url)
        .scrape(mapFnc)
        .then(thenFnc);
}

function getUrl(baseUrl, limit = 100, pid = null, tags) {
    let url = baseUrl

    if (limit) {
        url += '&limit=' + limit;
    }

    if (pid) {
        url += '&pid=' + pid;
    }

    if (tags) {
        url += '&tags=' + tags;
    }

    return url;
}

function getTags(limit = 100, pid = null, name = null, callback = (posts) => null, sort = null, order_by = "posts") {
    let url = getUrl('https://rule34.xxx/index.php?page=tags&s=list', limit, pid, name);
    if (name) {
        url += "&tags=" + name;
    }

    if (sort) {
        url += "&sort=" + sort;
    }

    if (order_by) {
        let translated;
        switch (order_by) {
            case "name":
                translated = "tag";
                break;
            case "posts":
                translated = "index_count";
                break;
            default:
                translated = order_by;
        }
        url += "&order_by=" + translated;
    }

    scrapper(url,
        function ($) {
            return $('table[class="highlightable"] tr').map(function () {
                if (this.children.length === 3) {

                    //extract information
                    let count = $(this.children[0]).text();
                    let name = $(this.children[1]).text();
                    let types = $(this.children[2]).text().replace(" (edit)", "").split(", ");

                    return {
                        name: name,
                        types: types,
                        posts: count
                    };
                }
            }).get();
        },
        function (comments) {
            callback(comments)
        });
}

function getMap(limit = 100, pid = null, tags = "", callback = (posts) => null) {
    let url = getUrl('https://rule34.xxx/index.php?page=dapi&s=post&q=index', limit, pid, tags);
    scrapper(url,
        function ($) {
            return $("post").map(function () {
                let result = this.attribs;

                // get comments url
                result.comments_url = process.env.HOST + '/comments?post_id=' + result.id;

                // convert tags
                result.tags = result.tags.split(" ")
                    .filter(tag => tag !== "");
                result.tags.filter(function (item, pos) {
                    return result.tags.indexOf(item) === pos;
                });

                // get type
                if (result.file_url.endsWith(".webm") || result.file_url.endsWith(".mp4")) {
                    result.type = "video";
                } else {
                    result.type = "image";
                }

                //modify urls
                result.creator_url = "https://rule34.xxx/index.php?page=account&s=profile&id=" + result.creator_id;

                return result;
            }).get();
        },
        function (posts) {
            callback(posts)
        });
}

module.exports = {
    getTags,
    getMap
}
CHANGELOG
=========


Version 0.2.1 (not yet released)
-------------------------------

* [(24e32c0)](https://github.com/versatica/JsSIP/commit/24e32c0d16ff5fcefd2319fc445a59d6fc2bcb59) UA configuration `password` parameter is now optional.
* [(ffe7af6)](https://github.com/versatica/JsSIP/commit/ffe7af6276915695af9fd00db281af51fec2714f) Bug fix: UA configuration `display_name` parameter.
* [(aa51291)](https://github.com/versatica/JsSIP/commit/aa512913733a4f63af066b0a9e12a8e38f2a5acb) Bug fix: Allows multibyte symbols in UA configuration `display_name` parameter (and require not to write it between double quotes).
* [(aa48201)](https://github.com/versatica/JsSIP/commit/aa48201) Bug fix: "cnonce" value value was not being quoted in Digest Authentication (reported by [vf1](https://github.com/vf1)).
* [(1ecabf5)](https://github.com/versatica/JsSIP/commit/1ecabf5) Bug fix: Fixed authentication for in-dialog requests (reported by [vf1](https://github.com/vf1)).
* [(11c6bb6)](https://github.com/versatica/JsSIP/commit/11c6bb6aeef9de3bf2a339263f620b1caf60d634) Allow receiving WebSocket binary messages (code provided by [vf1](https://github.com/vf1)).
* [(0e8c5cf)](https://github.com/versatica/JsSIP/commit/0e8c5cf) Bug fix: Fixed Contact and Record-Route header split (reported by Davide Corda).
* [(0c91285)](https://github.com/versatica/JsSIP/commit/0c91285) Bug fix: Fixed failure causes in 'registrationFailed' UA event.


Version 0.2.0 (released in 2012-11-01)
--------------------------------------

* First stable release with full website and documentation.
* Refactored sessions, message and events API.


Version 0.1.0 (released in 2012-09-27)
--------------------------------------

* First release. No documentation.


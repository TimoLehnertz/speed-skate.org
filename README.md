# www.roller-results.com
This is an open source project aiming to make Inline Speedskating more accessible to everyday people by sharing all results at a central place.

# local installation
Requirements:
 - xamp: https://www.apachefriends.org/de/index.html
 - MySQL: https://dev.mysql.com/downloads/installer/
 - MySQL Workbench: https://www.mysql.com/de/products/workbench/

Installation:
 - Install and configure mysql. Leave the default username on root and dont set a password. If you do you will need to change them in /data/dbh.php as well
 - Install and open MySQL Workbench. Connect to your local mysql database. adding a connection and leaving the settings on default should do the job
 - connect to the database and select Server > data import. Import the folder /data/dummyDatabase
 - Install the requirements
 - Clone this repository prefferably to this location C:\xampp\htdocs
 - launch xamp. If windows doesnt find it. there is a xamp.exe in the installation folder wich should work.
 - In xamp: click the "Config" button next to apache and select the first option(httpd.conf)
 - find the line that says "DocumentRoot <path>" and change the path to DocumentRoot "C:/xampp/htdocs/roller-results.com/public_html" (or the path of public_html on your system)
 - find the line that says "<Directory <path>>" and change the path to DocumentRoot "C:/xampp/htdocs/roller-results.com/public_html" (or the path of public_html on your system)
 - start the Apache service in XAMP and type "localhost" in your browsers address bar. If you see the roller results start page everything till now works
 - finally you need to create a folder named secret in the projects root directory. In this folder create a new file called secrets.php. in there paste the following code and save:
`<?php
$serverName = "localhost";
$dBUsername = "root";
$dBPwd = "";
?>`
 - You should now have a working instance of roller results on your pc
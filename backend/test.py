import smtplib

s = smtplib.SMTP("smtp.gmail.com", 587)
s.starttls()

s.login("caktelobambang@gmail.com", "mzdk kvgq mwef frkw")  # should work
s.login("caktelobambang@gmail.com", "mzdkkvgqmweffrkw")    # will fail (535)

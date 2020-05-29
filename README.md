# Covid-19

I've been plotting data from the CDC and from usafacts.org in various ways.

I'm just about burned out on this little project and am ready to hand it
over to the community for further improvement. Especially the "algorithm"
(it's an insult to real algorithms to call it that) used in the "heatmap",
which was just to see if I had the display part of the code working.
What probably should be done is, first, to smooth the data with a 7-day
running average; then take the first or 2nd derivative, which may sound
complicated but really just means looping from the end of the data back
to the beginning, storing the difference between the following entry and
the current one. A simple example: the series 1 2 3 4 5. Starting from
4: 5-4=1. You now have 1 2 3 1 5. But then 4-3 also becomes 1. So does 3-2 and
2-1. There's nothing after 5, so you copy the "derivative" into it. You're left
with a first derivative of 1 1 1 1 1, which is a straight line. That's your
velocity (of virus spread, in this case).

Now to get the acceleration, 2nd derivative, you simply repeat the process.
It doesn't take much mental exercise to see that it's going to yield
0 0 0 0 0: no acceleration at all.

Actual mathematicians will say "This is all wrong!", and they'd be right.
I'm using the difference as a proxy for the tangent. It's a useful fiction
for this purpose.

With the actual data, the acceleration will show both positive and negative
numbers. Colors for anything above zero could range from yellow to orange to
red, and from zero down, going perhaps through cyan to deep blue. With the 
"weekend effect" of data reporting slumping Saturday, Sunday, and Monday, you
would see a very colorful display if you don't smooth the data over a 7-day
running average first.

A problem with using "Scale relative to population" is that it becomes overly
sensitive to outliers, such as Trousdale County, TN, with a population of
11284, in which the confirmed cases count jumped from 123 to 1020 in a single
day. Since that is so large, all other counties/days will be very low by
comparison, so the map remains green almost the entire run.

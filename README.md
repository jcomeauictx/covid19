# Covid-19

I've been plotting data from the CDC and from usafacts.org in various ways.

I'm just about burned out on this little project and am ready to hand it
over to the community for further improvement. Especially the "algorithm"
(it's an insult to real algorithms to call it that) used in the "heatmap",
which was just to see if I had the display part of the code working.
What probably should be done is, first, to smooth the data with a 7-day
running average; then take the first or 2nd derivative, which may sound
complicated but really just means looping from the end of the data back
to the beginning, storing the difference between the current entry and
the one before it. A simple example: the series 1 2 3 4 5. Starting from
5: 5-4=1. You now have 1 2 3 4 1. But then 4-3 also becomes 1. So does 3-2 and
2-1. There's nothing before the first 1, so you just leave it. You're left
with a first derivative of 1 1 1 1 1, which is a straight line. That's your
velocity (of virus spread, in this case).

Now to get the acceleration, 2nd derivative, you simply repeat the process.
It doesn't take much mental exercise to see that it's going to yield
0 0 0 0 0: no acceleration at all.

With the actual data, the acceleration will show both positive and negative
numbers. Colors for anything above zero could range from yellow to orange to
red, and from zero down, going perhaps through cyan to deep blue. With the 
"weekend effect" of data reporting slumping Saturday, Sunday, and Monday, you
would see a very colorful display if you don't smooth the data over a 7-day
running average first.

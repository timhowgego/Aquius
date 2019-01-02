# Live Demonstrations

> _Here+Us_ - An Alternative Approach to Public Transport Network Discovery

This section contains examples of [Aquius](https://timhowgego.github.io/Aquius/) displaying public transport networks, plus hosted tools for constructing Aquius datasets:

* [Barcelona](#barcelona) - comprehensive urban network built from multiple sources, including strategic analysis of network changes.
* [FlixBus](#flixbus) - long-distance international European network, containing extensive cabotage (pickup and setdown) restrictions.
* [Paris](#paris) - one of the largest European urban networks.
* [Spanish Railways](#spanish-railways) - traditional national railway network, including split trains and mixed products.
* [York](#york) - basic small city network, including lasso routes.
* [Tools](#tools) - build networks from GTFS or GeoJSON, or merge network together.

## Barcelona

[![Aquius at Plaça Catalunya](https://timhowgego.github.io/Aquius/static/aquius-placa-catalunya.jpg)](https://timhowgego.github.io/Aquius/live/amb-2018/#r1/p2/s4/z13/tca-ES)

[Àrea Metropolitana de Barcelona (26 November-2 December 2018)](https://timhowgego.github.io/Aquius/live/amb-2018/): Snapshot of all non-tourist scheduled public transport within the [Àrea Metropolitana de Barcelona](http://www.amb.cat/) (AMB) - [more information about this dataset](https://timhowgego.github.io/AquiusData/es-amb/).

[AMB Vortex (26 November-2 December 2018)](https://timhowgego.github.io/Aquius/live/amb-vortex-2018/): As above, but in a fixed coordinate grid, ideal for strategic analysis.

The AMB Vortex map includes sample proposed network changes - [Diagonal tram](http://ajuntament.barcelona.cat/mobilitat/tramviaconnectat/es) (direct on-street route), [L9/10 connection](https://ca.wikipedia.org/wiki/L%C3%ADnia_9_del_metro_de_Barcelona) (with all proposed stations, except those in Zona Franca), and [Rodalies 2026](http://territori.gencat.cat/web/.content/home/01_departament/plans/plans_sectorials/mobilitat/pla_dinfraestructures_del_transport_de_catalunya_2006-2026/pitc11transportpublic_tcm32-35012.pdf) (suburban railway as proposed in 2006). These examples are not intended to replace detailed (but specific) analysis of proposals in isolation. Rather to show how quite different proposals can be considered in their shared context - which for cities can otherwise be extremely difficult to comprehend. Aquius doesn't just allow networks to better understood: Even without a proper interface (proposed routes currently need to be outlined in GIS software, base networks filtered appropriately, and the combination rebuilt), the networks demonstrated here can be built and probed in a matter of minutes.

## FlixBus

[FlixBus (20-26 August 2018)](https://timhowgego.github.io/Aquius/live/flixbus-aug-2018/): Snapshot of all European FlixBus (and FlixTrain) services - [more information about this dataset](https://timhowgego.github.io/AquiusData/eu-interbus/).

The FlixBus network is almost impossible to communicate on a fixed map because its service patterns are often defined by cabotage restrictions, especially in Iberia and the Balkans. Such cabotage restrictions may prevent FlixBus conveying passengers _within_ countries or regions, often rendering the destinations available to passengers quite different to the route taken by the vehicle. This added complexity is not a limitation for [Aquius](https://timhowgego.github.io/Aquius/), which always draws its route map from a user-specified _here_. FlixBus represents an extreme test case of cabotaged international operation, since on some routes almost every place served is defined with a different set of boarding and alighting restrictions. FlixBus [host their own dynamic network map](https://www.flixbus.co.uk/bus-routes), however this can feel laggy, and does not give any indication of service frequency - destinations with one bus a week are shown just as prominantly as destinations with one bus an hour. The Aquius dataset is relatively large - almost 1 MegaByte uncompressed, even without headcode information and day-by-day service filters (which can potentially be [built from GTFS](https://timhowgego.github.io/Aquius/live/gtfs/)) - but is smoother to use and more indicative of services.

## Paris

[![La Défense Daytime](https://timhowgego.github.io/Aquius/static/aquius-paris-defense.jpg)](https://timhowgego.github.io/Aquius/live/petite-paris-2019/#x2.28/y48.8907/z12/c2.24224/k48.88989/m13/tfr-FR/n1)

[Inner Paris (7-13 January 2019)](https://timhowgego.github.io/Aquius/live/petite-paris-2019/): Snapshot of every scheduled public transport service within the Petite Couronne of Paris - [more information about this dataset](https://timhowgego.github.io/AquiusData/fr-paris/).

## Spanish Railways

[![Aquius at Ciudad Real](https://timhowgego.github.io/Aquius/static/aquius-ciudad-real.jpg)](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/#x-3.296/y39.092/z7/c-3.966/k38.955/m8/s7/vlphn/tes-ES)

[Spanish Railways (Friday 20 July 2018)](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/): Snapshot of all non-tourist passenger train services within Spain - [more information about this dataset](https://timhowgego.github.io/AquiusData/es-rail/).

[Renfe Obligación de Servicio Público](https://timhowgego.github.io/Aquius/live/renfe-osp-20-jul-2018/): As Friday 20 July 2018 above, but with custom filters for each Renfe state supported product, plus administrative boundaries.

[Renfe LD/MD (10-16 December 2018)](https://timhowgego.github.io/Aquius/live/renfe-ld-md-dec-2018/): GTFS extract from the first batch of Renfe open data. The extract excludes Cercanías (most suburban), Feve (metre gauge), Trenhotel (sleeper) and non-domestic services. Unlike earlier data, the extract summarises both directions across a full week, including crude time period analysis.

## York

[York (January 2019)](https://timhowgego.github.io/Aquius/live/york-2019/): Snapshot of all bus services within the City of York - [more information about this dataset](https://timhowgego.github.io/AquiusData/uk-york/).

## Tools

### GTFS to Aquius

[GTFS to Aquius](https://timhowgego.github.io/Aquius/live/gtfs/) - Tool to convert single [General Transit Feed Specification](https://developers.google.com/transit/gtfs/reference/) files into Aquius datasets. Also see [GTFS to Aquius documentation](https://timhowgego.github.io/Aquius/#gtfs-to-aquius).

### GeoJSON to Aquius

[GeoJSON to Aquius](https://timhowgego.github.io/Aquius/live/geojson/) - Tool to create Aquius datasets from bespoke geospatial networks. Also see [GeoJSON to Aquius documentation](https://timhowgego.github.io/Aquius/#geojson-to-aquius).

### Merge Aquius

[Merge Aquius](https://timhowgego.github.io/Aquius/live/merge/) - Tool to merge Aquius datasets together. Also see [Merge Aquius documentation](https://timhowgego.github.io/Aquius/#merge-aquius).

## More Information

* [User FAQ](https://timhowgego.github.io/Aquius/#user-faq)
* [Host or Create](https://timhowgego.github.io/Aquius/#quick-setup)

import React from 'react';
import { Link } from 'react-router-dom';

const Section = ({ title, children }) => (
  <div className="bg-surface rounded-card p-5 space-y-2">
    <h2 className="text-sm font-semibold text-label">{title}</h2>
    <div className="text-xs text-label-2 leading-relaxed space-y-2">{children}</div>
  </div>
);

export const AboutPage = () => (
  <div className="space-y-5 max-w-3xl mx-auto py-8 px-4">
    <div className="bg-surface p-6 rounded-card space-y-2">
      <h1 className="text-xl font-semibold text-label">About LandSafe</h1>
      <p className="text-sm text-label-2 leading-relaxed">
        LandSafe shows landslide risk for places in India, built for Smart India Hackathon 2026 (problem statement SIH26001).
        It is a student project, not an official warning service. Always follow local authorities and call 112 in an emergency.
      </p>
    </div>

    <Section title="How the risk score works">
      <p>
        A random forest model (200 trees) was trained on 669 rain-triggered landslides in India from the NASA Global Landslide
        Catalog, and on 1,301 cases without a landslide: the same places in other years, and nearby places on the same day.
        For each case it uses the rain in the 24 and 72 hours before, topsoil moisture (ERA5), slope and elevation
        (Copernicus DEM), and how many catalogued landslides happened within 35 km.
      </p>
      <p>
        For a live score, the same inputs are fetched from Open-Meteo and the Copernicus DEM. If any input is missing, no score is
        shown. Scores are only given for places in India, where the model was trained. Tested on regions it never saw, it caught
        about two in three landslides. See the <Link to="/ml-model" className="underline">risk model</Link> page for details.
      </p>
      <p>
        When officials verify ground reports near a zone, its score is raised by 5 points per report, up to 15.
      </p>
    </Section>

    <Section title="Where the data comes from">
      <ul className="list-disc list-inside space-y-1">
        <li>Open-Meteo: rain, temperature, humidity and topsoil moisture.</li>
        <li>Copernicus DEM GLO-90: elevation and slope.</li>
        <li>NASA Global Landslide Catalog: 1,265 past landslides in India, 2007–2016.</li>
        <li>NASA EONET: open natural events in India.</li>
        <li>OpenStreetMap: place names, hospitals, shelters and road routes.</li>
        <li>Published reports (linked on each event) for major recent landslides.</li>
      </ul>
      <p>See <Link to="/data-sources" className="underline">data sources</Link>.</p>
    </Section>

    <Section title="What LandSafe does not do">
      <ul className="list-disc list-inside space-y-1">
        <li>It does not issue official warnings. Alerts are model results.</li>
        <li>An SOS request is not sent to emergency services or rescue teams. Call 112.</li>
        <li>It does not track you. Your location is used only while the app is open.</li>
      </ul>
    </Section>
  </div>
);
